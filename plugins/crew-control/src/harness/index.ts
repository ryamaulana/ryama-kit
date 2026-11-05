// Harness: menjalankan program `claude` asli (stream-json + tuan rumah izin stdio + hook HTTP PreToolUse untuk Jeda).
// Terbukti di spike/probe.mjs. Tanpa paket Agent SDK, tanpa menyentuh token login.
// Interface: startRun / answer / sendMessage / pause / resume / stop / hook / shutdown. Hasil lewat Store.
import { spawn } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import { TERMINAL_STATUSES, type AnswerRequest, type Message, type Question, type Run } from '../contract/index.js';
import { decide } from '../policy.js';
import { projectKey } from '../projects.js';
import { HarnessError, type HarnessOptions, type Live } from './session.js';
import { QuestionsInput, clip, nowIso, summarize } from './stream.js';
import { liveStatus } from '../conductor/status.js';
import { LIMIT_DEFAULTS, killTree as killTreeOf, type ResolvedOptions } from './limits.js';

export { HarnessError, type HarnessOptions } from './session.js';

export class Harness {
  /** Pengamat giliran (FreeFlow): activity = ada kemajuan/pesan baru, result = giliran selesai, end = proses berhenti. */
  onTurn?: (runId: string, ev: 'activity' | 'result' | 'end') => void;
  private live = new Map<string, Live>();
  private byKey = new Map<string, Live>();
  private byToken = new Map<string, Live>();
  private o: ResolvedOptions;

  constructor(opts: HarnessOptions) {
    this.o = { ...LIMIT_DEFAULTS, ...opts };
  }

  private get store() { return this.o.store; }

  // ---------- perintah dari luar ----------
  /** projectDir harus sudah divalidasi (resolveProject). Satu run aktif per proyek. */
  startRun(req: { projectDir: string; prompt: string; model?: string }): Run {
    const run: Run = {
      id: crypto.randomUUID(), project: req.projectDir, projectName: path.basename(req.projectDir), prompt: req.prompt,
      model: req.model ?? null, origin: 'dashboard', status: 'running', reason: null, lastLog: null, sessionId: null,
      pending: 0, tokens: null, startedAt: nowIso(), endedAt: null, durationMs: null,
    };
    return this.launch(run, req.prompt, null);
  }

  /** Id run aktif di folder ini, atau null. */
  activeRunId(projectDir: string): string | null { return this.byKey.get(projectKey(projectDir))?.run.id ?? null; }

  /** Tutup stdin sesi: claude keluar dengan tenang setelah giliran selesai. */
  closeSession(runId: string): void {
    const l = this.live.get(runId);
    if (l) this.endStdin(l);
  }

  /** Sesi milik proses Harness yang masih hidup (hook desktop dari sesi ini diabaikan, F10). */
  isOwnSession(sessionId: string): boolean { return [...this.live.values()].some((l) => l.run.sessionId === sessionId); }

  /** Jalankan proses claude untuk run ini (baru, atau melanjutkan sesi `resumeId` setelah giliran sebelumnya selesai). */
  private launch(run: Run, firstText: string, resumeId: string | null): Run {
    const key = projectKey(run.project);
    const busy = this.byKey.get(key);
    if (busy) throw new HarnessError('project_busy', 'Proyek ini sudah punya run aktif.', 409, { activeRunId: busy.run.id });
    if (this.live.size >= this.o.maxRuns) {
      throw new HarnessError('capacity', `Sudah ada ${this.live.size} run aktif (batas ${this.o.maxRuns}).`, 409);
    }
    // T2 (SPIKE): id sesi diberikan sendiri agar diketahui sebelum proses jalan; lanjut sesi tetap lewat --resume.
    if (!resumeId) run = { ...run, sessionId: crypto.randomUUID() };
    const token = crypto.randomBytes(16).toString('hex');
    const settings = {
      hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'http', url: `${this.o.hookBaseUrl}/hook/${token}`, timeout: 3600 }] }] },
    };
    const args = [
      ...this.o.binArgs,
      '-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
      ...(run.model ? ['--model', run.model] : []),
      ...(resumeId ? ['--resume', resumeId] : ['--session-id', run.sessionId!]),
      '--permission-mode', 'default', '--permission-prompt-tool', 'stdio',
      '--settings', JSON.stringify(settings),
    ];
    const child = spawn(this.o.bin, args, { cwd: run.project, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
    const l: Live = {
      run, child, key, token, paused: false, stopRequested: false, disconnect: false, exited: false, waiters: [],
      pending: new Map(), queued: [], stopTimers: [], stderrTail: '', seq: 0,
    };
    this.live.set(run.id, l);
    this.byKey.set(key, l);
    this.byToken.set(token, l);
    this.store.saveRun(run);

    child.stdin!.on('error', () => {}); // EPIPE saat proses sudah mati; ditangani lewat exit
    child.stderr!.on('data', (d) => { l.stderrTail = (l.stderrTail + d).slice(-2000); });
    let buf = '';
    child.stdout!.on('data', (d) => {
      buf += d;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) this.onLine(l, line);
      }
    });
    child.on('error', (e: NodeJS.ErrnoException) => {
      l.stderrTail = e.code === 'ENOENT' ? `Program "${this.o.bin}" tidak ditemukan.` : String(e.message);
      this.finalize(l, null);
    });
    child.on('exit', (code) => this.finalize(l, code));

    this.control(l, { subtype: 'initialize', hooks: null });
    this.sendUser(l, firstText);
    return run;
  }

  answer(runId: string, messageId: string, body: AnswerRequest): Message {
    const msg = this.store.getMessage(messageId);
    if (!msg || msg.runId !== runId) throw new HarnessError('not_found', 'Pesan tidak ditemukan.', 404);
    if (msg.kind !== body.kind) throw new HarnessError('wrong_kind', `Pesan ini bertipe ${msg.kind}, bukan ${body.kind}.`, 400);
    if (msg.state !== 'pending') {
      throw new HarnessError('already_answered', msg.state === 'cancelled' ? 'Permintaan ini sudah dibatalkan.' : 'Sudah dijawab.', 409, {
        state: msg.state, answeredFrom: msg.answer?.from ?? null,
      });
    }
    const l = this.live.get(runId);
    const p = l?.pending.get(messageId);
    if (!l || !p) throw new HarnessError('not_active', 'Run ini tidak lagi menunggu jawaban.', 409);

    let answered: Message;
    if (body.kind === 'question') {
      const wanted = (msg.questions ?? []).map((q) => q.question);
      const given = Object.keys(body.answers);
      const unknown = given.filter((k) => !wanted.includes(k));
      const missing = wanted.filter((k) => !given.includes(k));
      if (unknown.length || missing.length) {
        throw new HarnessError('invalid_answer', 'Jawaban harus mencakup tepat semua pertanyaan.', 400, { unknown, missing });
      }
      const answers = Object.fromEntries(given.map((k) => { const v = body.answers[k]; return [k, Array.isArray(v) ? v.join(', ') : v]; }));
      this.reply(l, p.requestId, { behavior: 'allow', updatedInput: { ...(p.input as object), answers } });
      answered = { ...msg, state: 'answered', answer: { from: 'dashboard', answers, decision: null, reason: null }, answeredAt: nowIso() };
    } else {
      if (body.decision === 'allow') this.reply(l, p.requestId, { behavior: 'allow', updatedInput: p.input });
      else this.reply(l, p.requestId, { behavior: 'deny', message: body.reason ? `Ditolak pemilik: ${body.reason}` : 'Ditolak pemilik.' });
      answered = {
        ...msg, state: 'answered', answeredAt: nowIso(),
        answer: { from: 'dashboard', answers: null, decision: body.decision, reason: body.reason ?? null },
      };
    }
    l.pending.delete(messageId);
    this.store.saveMessage(answered);
    this.sync(l);
    return answered;
  }

  /** Run aktif: pesan masuk ke sesi yang jalan. Run sudah berakhir tetapi punya sesi: lanjutkan sesi yang sama (chat berkelanjutan). */
  sendMessage(runId: string, text: string): Message {
    if (!this.live.has(runId)) {
      const old = this.store.getRun(runId);
      if (old && TERMINAL_STATUSES.includes(old.status)) {
        const latest = this.store.listRuns(old.project, 1)[0];
        if (latest && latest.id !== old.id) throw new HarnessError('run_read_only', 'Run ini bukan run terakhir proyek.', 409, { latestRunId: latest.id });
        if (old.status !== 'done') throw new HarnessError('run_read_only', 'Hanya run yang selesai yang bisa dilanjutkan dengan pesan.', 409, { latestRunId: old.id });
        if (old.sessionId) return this.continueRun(old, text);
      }
    }
    const l = this.activeOrThrow(runId);
    const base = this.newMessage(runId, 'owner', text);
    if (l.paused) {
      const m = { ...base, state: 'queued' as const };
      l.queued.push({ messageId: m.id, text });
      this.store.saveMessage(m);
      return m;
    }
    const m = { ...base, state: 'sent' as const };
    this.store.saveMessage(m);
    this.sendUser(l, text);
    return m;
  }

  private continueRun(old: Run, text: string): Message {
    const m = { ...this.newMessage(old.id, 'owner', text), state: 'sent' as const };
    // launch() melempar bila proyek sibuk/penuh sebelum apa pun disimpan
    this.launch({ ...old, status: 'running', reason: null, lastLog: null, pending: 0, endedAt: null, durationMs: null }, text, old.sessionId);
    this.store.saveMessage(m);
    return m;
  }

  pause(runId: string): Run {
    const l = this.activeOrThrow(runId);
    l.paused = true;
    this.sync(l);
    return l.run;
  }

  resume(runId: string): Run {
    const l = this.activeOrThrow(runId);
    if (!l.paused) return l.run;
    l.paused = false;
    for (const q of l.queued.splice(0)) {
      const m = this.store.getMessage(q.messageId);
      if (m) this.store.saveMessage({ ...m, state: 'sent', sentOnResume: true });
      this.sendUser(l, q.text);
    }
    l.waiters.splice(0).forEach((r) => r());
    this.sync(l);
    return l.run;
  }

  stop(runId: string): Run {
    const l = this.live.get(runId);
    if (!l) {
      const r = this.store.getRun(runId);
      if (!r) throw new HarnessError('not_found', 'Run tidak ditemukan.', 404);
      return r; // sudah berakhir: idempoten
    }
    if (l.stopRequested) return l.run;
    l.stopRequested = true;
    for (const [mid, p] of l.pending) { // jawab "tolak" agar claude tidak menggantung
      this.reply(l, p.requestId, { behavior: 'deny', message: 'Run dihentikan oleh pemilik.' });
      this.cancelMessage(mid);
    }
    l.pending.clear();
    l.waiters.splice(0).forEach((r) => r());
    this.control(l, { subtype: 'interrupt' });
    l.stopTimers.push(setTimeout(() => this.endStdin(l), this.o.stopSoftMs));
    l.stopTimers.push(setTimeout(() => this.killTree(l), this.o.stopKillMs));
    this.sync(l);
    return l.run;
  }

  /** Dipanggil route /hook/:token. Menahan PreToolUse selama Jeda (spike: jeda). */
  async hook(token: string, body: any): Promise<Record<string, unknown>> {
    const l = this.byToken.get(token);
    if (!l) return {};
    if (body?.hook_event_name === 'PreToolUse') {
      while (l.paused && !l.stopRequested && !l.exited) await new Promise<void>((r) => l.waiters.push(r));
      if (l.stopRequested) {
        return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'Run dihentikan oleh pemilik.' } };
      }
    }
    return {};
  }

  /** Server berhenti: matikan semua proses; run ditandai Terputus (bukan Gagal). */
  shutdown(): void {
    for (const l of this.live.values()) { l.disconnect = true; this.killTree(l); }
  }

  // ---------- protokol claude ----------
  private write(l: Live, obj: unknown) {
    if (!l.exited && l.child.stdin?.writable) l.child.stdin.write(JSON.stringify(obj) + '\n');
  }
  private control(l: Live, request: Record<string, unknown>) {
    this.write(l, { type: 'control_request', request_id: `req_${++l.seq}`, request });
  }
  private reply(l: Live, requestId: string, response: unknown) {
    this.write(l, { type: 'control_response', response: { subtype: 'success', request_id: requestId, response } });
  }
  private sendUser(l: Live, text: string) {
    l.lastResult = undefined; // giliran baru dimulai; `result` lama tidak lagi menentukan akhir
    this.onTurn?.(l.run.id, 'activity');
    this.write(l, { type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null, session_id: '' });
  }
  private endStdin(l: Live) {
    try { l.child.stdin?.end(); } catch { /* sudah tertutup */ }
  }
  private killTree(l: Live) {
    killTreeOf(l);
  }

  private onLine(l: Live, line: string) {
    let m: any;
    try { m = JSON.parse(line); } catch { return; }
    switch (m.type) {
      case 'system':
        if (m.subtype === 'init') this.patch(l, { sessionId: m.session_id ?? null, model: l.run.model ?? m.model ?? null });
        break;
      case 'control_request': this.onControlRequest(l, m); break;
      case 'control_cancel_request': this.onCancel(l, m.request_id); break;
      case 'assistant': this.onAssistant(l, m); break;
      case 'result': this.onResult(l, m); break;
    }
  }

  private onAssistant(l: Live, m: any) {
    l.lastResult = undefined;
    this.onTurn?.(l.run.id, 'activity');
    const sub = m.parent_tool_use_id != null;
    for (const c of m.message?.content ?? []) {
      if (c.type === 'text' && !sub && typeof c.text === 'string' && c.text.trim()) {
        this.store.saveMessage(this.newMessage(l.run.id, 'agent', clip(c.text, 20000)));
      } else if (c.type === 'tool_use') {
        this.store.addTool(l.run.id, { name: String(c.name), summary: summarize(c.input), subagent: sub, at: nowIso() });
      }
    }
  }

  private onControlRequest(l: Live, m: any) {
    const req = m.request ?? {};
    if (req.subtype !== 'can_use_tool') {
      this.write(l, { type: 'control_response', response: { subtype: 'error', request_id: m.request_id, error: 'tidak didukung' } });
      return;
    }
    l.lastResult = undefined;
    this.onTurn?.(l.run.id, 'activity');
    const tool = String(req.tool_name);
    const input = req.input ?? {};
    if (tool === 'AskUserQuestion') {
      const parsed = QuestionsInput.safeParse(input);
      if (!parsed.success) {
        this.reply(l, m.request_id, { behavior: 'deny', message: 'Format pertanyaan tidak terbaca.' });
        return;
      }
      const questions: Question[] = parsed.data.questions.map((q) => ({
        question: clip(q.question, 2000), header: q.header ? clip(q.header, 200) : null, multiSelect: q.multiSelect ?? false,
        options: (q.options ?? []).map((o) => ({ label: clip(o.label, 500), description: o.description ? clip(o.description, 1000) : null })),
      }));
      const msg: Message = { ...this.newMessage(l.run.id, 'question', questions.map((q) => q.question).join('\n')), state: 'pending', questions };
      l.pending.set(msg.id, { requestId: m.request_id, input });
      this.store.saveMessage(msg);
      this.sync(l);
      return;
    }
    const d = decide(tool, input, l.run.project);
    if (d.action === 'allow') {
      this.reply(l, m.request_id, { behavior: 'allow', updatedInput: input });
      return;
    }
    const msg: Message = {
      ...this.newMessage(l.run.id, 'permission', `Izin untuk ${tool}`),
      state: 'pending', tool: { name: tool, summary: summarize(input), why: d.why },
    };
    l.pending.set(msg.id, { requestId: m.request_id, input });
    this.store.saveMessage(msg);
    this.sync(l);
  }

  /** claude membatalkan permintaan (mis. dijawab di tempat lain): First-wins, tampil sebagai dibatalkan. */
  private onCancel(l: Live, requestId: string) {
    for (const [mid, p] of l.pending) {
      if (p.requestId === requestId) {
        l.pending.delete(mid);
        this.cancelMessage(mid, 'agent');
        this.sync(l);
        return;
      }
    }
  }

  private onResult(l: Live, m: any) {
    l.lastResult = m;
    const u = m.usage ?? {};
    this.patch(l, {
      tokens: {
        input: u.input_tokens ?? 0, output: u.output_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0,
      },
    });
    if (l.stopRequested) this.endStdin(l);
    else this.onTurn?.(l.run.id, 'result');
  }

  // ---------- status dan penutupan ----------
  private patch(l: Live, p: Partial<Run>) {
    l.run = { ...l.run, ...p };
    this.store.saveRun(l.run);
  }
  /** Prioritas: paused > needs_owner > running. */
  private sync(l: Live) {
    if (l.exited) return;
    const pending = l.pending.size;
    const status = liveStatus({ paused: l.paused, pending });
    if (status !== l.run.status || pending !== l.run.pending) this.patch(l, { status, pending });
  }

  private finalize(l: Live, code: number | null) {
    if (l.exited) return;
    l.exited = true;
    this.onTurn?.(l.run.id, 'end');
    l.stopTimers.forEach(clearTimeout);
    l.waiters.splice(0).forEach((r) => r());
    for (const mid of l.pending.keys()) this.cancelMessage(mid);
    for (const q of l.queued) this.cancelMessage(q.messageId);
    l.pending.clear();
    this.live.delete(l.run.id);
    this.byKey.delete(l.key);
    this.byToken.delete(l.token);

    const res = l.lastResult;
    let status: Run['status'];
    let reason: string | null = null;
    if (l.disconnect) { status = 'disconnected'; reason = 'Server dashboard dihentikan saat run berjalan.'; }
    else if (l.stopRequested) { status = 'stopped'; reason = 'Dihentikan oleh pemilik.'; }
    else if (res && !res.is_error) status = 'done';
    else {
      status = 'failed';
      reason = res ? `Claude melaporkan galat (${res.subtype ?? 'error'}).` : `Proses claude berhenti tanpa hasil (kode ${code ?? 'tidak ada'}).`;
    }
    const endedAt = nowIso();
    this.patch(l, {
      status, reason, pending: 0, endedAt, durationMs: Date.parse(endedAt) - Date.parse(l.run.startedAt),
      lastLog: status === 'failed' && l.stderrTail ? clip(l.stderrTail.trim(), 2000) : null,
    });
    const text = status === 'done' ? 'Run selesai.' : status === 'stopped' ? 'Run dihentikan.' : status === 'disconnected' ? 'Run terputus.' : `Run gagal. ${reason}`;
    this.store.saveMessage(this.newMessage(l.run.id, 'system', text));
  }

  // ---------- util ----------
  private activeOrThrow(runId: string): Live {
    const l = this.live.get(runId);
    if (l && !l.stopRequested) return l;
    if (!l && !this.store.getRun(runId)) throw new HarnessError('not_found', 'Run tidak ditemukan.', 404);
    throw new HarnessError('run_not_active', 'Run ini sudah berakhir atau sedang dihentikan.', 409);
  }

  private newMessage(runId: string, kind: Message['kind'], text: string): Message {
    return {
      id: crypto.randomUUID(), runId, kind, text, createdAt: nowIso(), state: null, questions: null, tool: null,
      answer: null, answeredAt: null, sentOnResume: false,
    };
  }

  private cancelMessage(messageId: string, from: 'agent' | 'system' = 'system') {
    const m = this.store.getMessage(messageId);
    if (m && (m.state === 'pending' || m.state === 'queued')) {
      this.store.saveMessage({
        ...m, state: 'cancelled', answeredAt: nowIso(), answer: { from, answers: null, decision: null, reason: null },
      });
    }
  }
}