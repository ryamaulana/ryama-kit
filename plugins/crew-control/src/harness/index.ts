// Harness: menjalankan program `claude` asli (stream-json + tuan rumah izin stdio + hook HTTP PreToolUse untuk Jeda).
// Terbukti di spike/probe.mjs. Tanpa paket Agent SDK, tanpa menyentuh token login.
// Interface: startRun / answer / sendMessage / pause / resume / stop / hook / shutdown. Hasil lewat Store.
import { spawn } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import { TERMINAL_STATUSES, type AnswerRequest, type Message, type Question, type Run } from '../contract/index.js';
import { decide } from '../policy.js';
import { projectId, projectKey } from '../projects.js';
import { HarnessError, type HarnessOptions, type Live } from './session.js';
import { QuestionsInput, clip, createActivityTracker, nowIso, summarize } from './stream.js';
import type { RunMeta } from '../store/types.js';
import { liveStatus } from '../conductor/status.js';
import { LIMIT_DEFAULTS, detectLimit, killTree as killTreeOf, type ResolvedOptions } from './limits.js';

export { HarnessError, type HarnessOptions } from './session.js';

export class Harness {
  /** Pengamat giliran (FreeFlow): activity = ada kemajuan/pesan baru, result = giliran selesai, end = proses berhenti. */
  onTurn?: (runId: string, ev: 'activity' | 'result' | 'end') => void;
  /** Id agent anggota tim (dipasang server dari katalog tim); null = tim tak dikenal, semua agent in_team=false. */
  teamAgentsOf?: (teamId: string) => string[] | null;
  private live = new Map<string, Live>();
  private byKey = new Map<string, Live>();
  private byToken = new Map<string, Live>();
  /** Run dijeda > pauseDetachMs: proses sudah ditutup, run tetap paused dan memegang proyek; Lanjut = --resume. */
  private detached = new Map<string, { run: Run; key: string; queued: Live['queued'] }>();
  private limitTimers = new Map<string, unknown>(); // jadwal lanjut otomatis per run limit_paused
  private o: ResolvedOptions;

  constructor(opts: HarnessOptions) {
    this.o = { ...LIMIT_DEFAULTS, ...opts };
  }

  private get store() { return this.o.store; }

  // ---------- perintah dari luar ----------
  /** projectDir harus sudah divalidasi (resolveProject). Satu run aktif per proyek. */
  startRun(req: { projectDir: string; prompt: string; model?: string; meta?: RunMeta }): Run {
    const run: Run = {
      id: crypto.randomUUID(), project: req.projectDir, projectName: path.basename(req.projectDir), prompt: req.prompt,
      model: req.model ?? null, origin: 'dashboard', status: 'running', reason: null, lastLog: null, sessionId: null,
      pending: 0, tokens: null, startedAt: nowIso(), endedAt: null, durationMs: null,
    };
    return this.launch(run, req.prompt, null, req.meta);
  }

  /** Id run aktif di folder ini, atau null. */
  activeRunId(projectDir: string): string | null {
    const key = projectKey(projectDir);
    return this.byKey.get(key)?.run.id ?? [...this.detached.values()].find((d) => d.key === key)?.run.id ?? null;
  }

  /** Tutup stdin sesi: claude keluar dengan tenang setelah giliran selesai. */
  closeSession(runId: string): void {
    const l = this.live.get(runId);
    if (l) this.endStdin(l);
  }

  /** Sesi milik proses Harness yang masih hidup (hook desktop dari sesi ini diabaikan, F10). */
  isOwnSession(sessionId: string): boolean { return [...this.live.values()].some((l) => l.run.sessionId === sessionId); }

  /** Jalankan proses claude untuk run ini (baru, atau melanjutkan sesi `resumeId` setelah giliran sebelumnya selesai). */
  private launch(run: Run, firstText: string, resumeId: string | null, meta?: RunMeta): Run {
    const key = projectKey(run.project);
    const busy = this.activeRunId(run.project);
    if (busy) throw new HarnessError('project_busy', 'Proyek ini sudah punya run aktif.', 409, { activeRunId: busy });
    const used = this.live.size + this.detached.size;
    if (used >= this.o.maxRuns) {
      throw new HarnessError('capacity', `Sudah ada ${used} run aktif (batas ${this.o.maxRuns}).`, 409);
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
      tracker: undefined!,
    };
    this.live.set(run.id, l);
    this.byKey.set(key, l);
    this.byToken.set(token, l);
    this.store.saveRun(run, meta);
    const teamId = this.store.runTeamId(run.id);
    l.tracker = createActivityTracker({
      runId: run.id, sessionId: run.sessionId ?? resumeId ?? '', teamAgents: teamId ? this.teamAgentsOf?.(teamId) ?? null : null,
      prior: this.store.listActivities(run.id),
    });

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
      // always: aturan dihitung ulang dari input asli; kategori berisiko tidak pernah disimpan.
      const rule = body.decision === 'always' ? this.ruleFor(msg, p.input, l.run.project) : null;
      if (body.decision === 'always' && !rule) {
        throw new HarnessError('rule_not_allowed', 'Selalu setujui tidak tersedia untuk perintah berisiko. Pilih Izinkan atau Tolak.', 400);
      }
      if (body.decision !== 'deny') this.reply(l, p.requestId, { behavior: 'allow', updatedInput: p.input });
      else this.reply(l, p.requestId, { behavior: 'deny', message: body.reason ? `Ditolak pemilik: ${body.reason}` : 'Ditolak pemilik.' });
      answered = {
        ...msg, state: 'answered', answeredAt: nowIso(),
        answer: { from: 'dashboard', answers: null, decision: body.decision, reason: body.reason ?? null },
      };
    }
    l.pending.delete(messageId);
    this.store.saveMessage(answered);
    if (body.kind === 'permission' && body.decision === 'always') this.saveRule(msg, p.input, l.run.project);
    this.sync(l);
    return answered;
  }

  private ruleFor(msg: Message, input: unknown, project: string) {
    const d = decide(msg.tool?.name ?? '', input, project);
    return d.action === 'ask' ? d.rule : null;
  }

  private saveRule(msg: Message, input: unknown, project: string) {
    const rule = this.ruleFor(msg, input, project)!;
    const id = crypto.randomUUID();
    this.store.saveRule({ id, projectId: projectId(project), tool: rule.tool, pattern: rule.pattern, createdFrom: msg.id, createdAt: nowIso(), revokedAt: null });
    this.store.saveMessage({ ...this.newMessage(msg.runId, 'system', `Aturan disimpan untuk proyek ini: ${describeRule(rule)}`), ref: { ruleId: id } });
  }

  /** Batalkan "Selalu setujui" (DELETE /api/projects/:id/rules/:ruleId); pesan sistem di run asal aturan. */
  revokeRule(projectIdOf: string, ruleId: string): void {
    const rule = this.store.listRules(projectIdOf).find((r) => r.id === ruleId);
    if (!rule) throw new HarnessError('not_found', 'Aturan tidak ditemukan.', 404);
    this.store.saveRule({ ...rule, revokedAt: nowIso() });
    const origin = rule.createdFrom ? this.store.getMessage(rule.createdFrom) : undefined;
    if (origin) this.store.saveMessage({ ...this.newMessage(origin.runId, 'system', `Aturan dibatalkan: ${describeRule(rule)}`), ref: { ruleId } });
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
    const d = this.detached.get(runId);
    const l = d ? null : this.activeOrThrow(runId);
    const base = this.newMessage(runId, 'owner', text);
    if (d || l!.paused) {
      const m = { ...base, state: 'queued' as const };
      (d ?? l!).queued.push({ messageId: m.id, text });
      this.store.saveMessage(m);
      return m;
    }
    const m = { ...base, state: 'sent' as const };
    this.store.saveMessage(m);
    this.sendUser(l!, text);
    return m;
  }

  private continueRun(old: Run, text: string): Message {
    const m = { ...this.newMessage(old.id, 'owner', text), state: 'sent' as const };
    // launch() melempar bila proyek sibuk/penuh sebelum apa pun disimpan
    this.launch({ ...old, status: 'running', reason: null, lastLog: null, pending: 0, endedAt: null, durationMs: null }, text, old.sessionId);
    this.store.saveMessage(m);
    return m;
  }

  /** Lanjutkan: run failed/disconnected terakhir proyek (dashboard) dilanjut di sesi terakhirnya, run yang sama. */
  continueFailed(runId: string): Run {
    const old = this.store.getRun(runId);
    if (!old) throw new HarnessError('not_found', 'Run tidak ditemukan.', 404);
    if (old.origin === 'desktop') throw new HarnessError('desktop_no_prompt', 'Sesi desktop hanya bisa dihentikan dari sini.', 409);
    if (this.live.has(runId) || !['failed', 'disconnected'].includes(old.status) || !old.sessionId) {
      throw new HarnessError('run_not_active', 'Hanya run gagal atau terputus yang bisa dilanjutkan.', 409);
    }
    const latest = this.store.listRuns(old.project, 1)[0];
    if (latest && latest.id !== old.id) throw new HarnessError('run_read_only', 'Run ini bukan run terakhir proyek.', 409, { latestRunId: latest.id });
    const run = this.launch({ ...old, status: 'running', reason: null, lastLog: null, pending: 0, endedAt: null, durationMs: null }, 'Lanjutkan pekerjaan sebelumnya.', old.sessionId);
    this.store.saveMessage({ ...this.newMessage(runId, 'system', 'Dilanjutkan di sesi baru.'), state: 'sent' as const });
    return run;
  }

  pause(runId: string): Run {
    const d = this.detached.get(runId);
    if (d) return d.run;
    const l = this.activeOrThrow(runId);
    if (!l.paused) l.detachTimer = this.o.clock.setTimeout(() => this.detach(l), this.o.pauseDetachMs);
    l.paused = true;
    this.sync(l);
    return l.run;
  }

  /** Jeda terlalu lama: putus giliran dan tutup proses (urutan sama dengan Stop); finalize menyimpan run sebagai terlepas. */
  private detach(l: Live) {
    if (!l.paused || l.stopRequested || l.exited || l.detaching) return;
    l.detaching = true;
    l.waiters.splice(0).forEach((r) => r());
    this.control(l, { subtype: 'interrupt' });
    l.stopTimers.push(setTimeout(() => this.endStdin(l), this.o.stopSoftMs));
    l.stopTimers.push(setTimeout(() => this.killTree(l), this.o.stopKillMs));
  }

  resume(runId: string): Run {
    const d = this.detached.get(runId);
    if (d) return this.resumeDetached(runId, d);
    const l = this.activeOrThrow(runId);
    if (l.detaching) { l.resumeAfterDetach = true; return l.run; }
    if (!l.paused) return l.run;
    this.o.clock.clearTimeout(l.detachTimer);
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

  /** Run limit_paused memegang proyek tanpa proses (seperti sesi terlepas) dan dijadwalkan lanjut: reset + 60 dtk, atau tiap 30 mnt bila jam tak terbaca. */
  private holdLimit(run: Run, key: string) {
    this.detached.set(run.id, { run, key, queued: [] });
    const at = (run as Run & { limitResetAt?: string | null }).limitResetAt;
    const delay = at ? Math.max(0, Date.parse(at) + 60_000 - Date.now()) : 30 * 60_000;
    this.limitTimers.set(run.id, this.o.clock.setTimeout(() => this.fireLimit(run.id), delay));
  }

  private fireLimit(runId: string) {
    this.limitTimers.delete(runId);
    const d = this.detached.get(runId);
    if (!d || d.run.status !== 'limit_paused') return;
    try {
      this.resumeDetached(runId, { ...d, run: { ...d.run, reason: null, limitResetAt: null } as Run });
    } catch { // kapasitas penuh dsb.: coba lagi 30 mnt
      this.limitTimers.set(runId, this.o.clock.setTimeout(() => this.fireLimit(runId), 30 * 60_000));
    }
  }

  /** Dipanggil main.ts saat server mulai: run limit_paused di data dijadwal ulang (berlaku untuk run ber-sesi). */
  restoreLimitPaused(): number {
    let n = 0;
    for (const { run, origin } of this.store.listActiveRuns()) {
      if (run.status !== 'limit_paused' || origin === 'desktop' || !run.sessionId || this.detached.has(run.id)) continue;
      this.holdLimit(run, projectKey(run.project));
      n++;
    }
    return n;
  }

  private clearLimitTimer(runId: string) {
    this.o.clock.clearTimeout(this.limitTimers.get(runId));
    this.limitTimers.delete(runId);
  }

  /** Sesi terlepas: proses baru `--resume` sesi yang sama; pesan antrean (digabung) atau "Lanjutkan.". */
  private resumeDetached(runId: string, d: { run: Run; key: string; queued: Live['queued'] }): Run {
    this.detached.delete(runId);
    this.clearLimitTimer(runId);
    const text = d.queued.length ? d.queued.map((q) => q.text).join('\n\n') : 'Lanjutkan.';
    let run: Run;
    try {
      run = this.launch({ ...d.run, status: 'running' }, text, d.run.sessionId);
    } catch (e) {
      this.detached.set(runId, d);
      throw e;
    }
    for (const q of d.queued) {
      const m = this.store.getMessage(q.messageId);
      if (m) this.store.saveMessage({ ...m, state: 'sent', sentOnResume: true });
    }
    return run;
  }

  stop(runId: string): Run {
    const d = this.detached.get(runId);
    if (d) { // tanpa proses: berhenti seketika, pekerjaan di folder tidak disentuh
      this.detached.delete(runId);
      this.clearLimitTimer(runId);
      for (const q of d.queued) this.cancelMessage(q.messageId);
      return this.end(d.run, 'stopped', 'Dihentikan oleh pemilik.', null);
    }
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
      while (l.paused && !l.stopRequested && !l.exited && !l.detaching) await new Promise<void>((r) => l.waiters.push(r));
      if (l.stopRequested || l.detaching) {
        const why = l.stopRequested ? 'Run dihentikan oleh pemilik.' : 'Run dijeda lama; langkah ini diulang saat dilanjutkan.';
        return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: why } };
      }
    }
    return {};
  }

  /** Server berhenti: matikan semua proses; run ditandai Terputus (bukan Gagal). */
  shutdown(): void {
    for (const id of [...this.limitTimers.keys()]) this.clearLimitTimer(id);
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
    l.limit ??= detectLimit(m) ?? undefined;
    const t = l.tracker.feed(m); // langkah alat (orkestrator + subagent) dan status agent
    for (const s of t.tools) this.store.addTool(l.run.id, s);
    for (const a of t.activities) this.store.saveActivity(a);
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
    const d = decide(tool, input, l.run.project, this.store.listRules(projectId(l.run.project)));
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
    if (l.stopRequested || l.detaching) this.endStdin(l);
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
    for (const a of l.tracker.end()) this.store.saveActivity(a);
    this.onTurn?.(l.run.id, 'end');
    l.stopTimers.forEach(clearTimeout);
    this.o.clock.clearTimeout(l.detachTimer);
    l.waiters.splice(0).forEach((r) => r());
    for (const mid of l.pending.keys()) this.cancelMessage(mid);
    const detached = l.detaching && !l.stopRequested && !l.disconnect;
    if (!detached) for (const q of l.queued) this.cancelMessage(q.messageId);
    l.pending.clear();
    this.live.delete(l.run.id);
    this.byKey.delete(l.key);
    this.byToken.delete(l.token);
    if (detached) { // run tetap paused tanpa proses; antrean disimpan untuk --resume
      this.patch(l, { status: 'paused', pending: 0 });
      this.detached.set(l.run.id, { run: l.run, key: l.key, queued: l.queued });
      if (l.resumeAfterDetach) this.resume(l.run.id);
      return;
    }

    if (l.limit && !l.stopRequested && !l.disconnect && l.run.sessionId) { // tahan run; jalan lagi sendiri setelah reset
      const at = l.limit.resetAt;
      const when = at ? `Lanjut otomatis sekitar ${new Date(at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.` : 'Jam reset tidak terbaca; dicoba lagi tiap 30 menit.';
      const run = { ...l.run, status: 'limit_paused' as const, reason: `Batas pemakaian tercapai. ${when}`, pending: 0, endedAt: null, durationMs: null, limitResetAt: at } as Run;
      l.run = run;
      this.store.saveRun(run);
      this.store.saveMessage(this.newMessage(run.id, 'system', run.reason!));
      this.holdLimit(run, l.key);
      return;
    }

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
    l.run = this.end(l.run, status, reason, status === 'failed' && l.stderrTail ? clip(l.stderrTail.trim(), 2000) : null);
  }

  private end(run: Run, status: Run['status'], reason: string | null, lastLog: string | null): Run {
    const endedAt = nowIso();
    const next = { ...run, status, reason, pending: 0, endedAt, durationMs: Date.parse(endedAt) - Date.parse(run.startedAt), lastLog };
    this.store.saveRun(next);
    const text = status === 'done' ? 'Run selesai.' : status === 'stopped' ? 'Run dihentikan.' : status === 'disconnected' ? 'Run terputus.' : `Run gagal. ${reason}`;
    this.store.saveMessage(this.newMessage(run.id, 'system', text));
    return next;
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

const describeRule = (r: { tool: string; pattern: string | null }) => (r.pattern === null ? r.tool : `${r.tool} ${r.pattern}`);
