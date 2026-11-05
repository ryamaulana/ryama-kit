// Logika murni Chat: jawaban, pesan galat, mode kotak ketik, susunan item panel (PRD F5, UX 5b).
import type { MessageV2, Message, ToolEvent, AnswerRequestV2 } from '../../../../src/contract/messages.js';
import type { RunStatus } from '../../../../src/contract/common.js';
import type { Run } from '../../../../src/contract/runs.js';
import { chatItems } from './chatItems.js';

type Msg = MessageV2 | Message;
// Bentuk struktural sama dengan ChatItem (ui/chat/ChatPanel.tsx) dan ComposerMode; tidak diimpor agar tes node tanpa JSX tetap jalan.
type Q = { id: string; text: string; multi?: boolean; options: { label: string; description?: string }[] };
type Resolved = { text: string; tone?: 'ok' | 'no' | 'cancel' };
export type PanelItem =
  | { kind: 'user'; id: string; text: string; pending?: string }
  | { kind: 'agent'; id: string; from: string; body: string }
  | { kind: 'tools'; id: string; steps: { agent: string; tool: string; summary: string }[] }
  | { kind: 'system'; id: string; variant: 'info' | 'rule' | 'limit' | 'bad'; text: string; ruleId?: string; detail?: { label: string; value: string }[]; continueRun?: boolean }
  | { kind: 'permission'; id: string; from: string; tool: string; command: string; why: string; resolved?: Resolved }
  | { kind: 'question'; id: string; from: string; questions: Q[]; resolved?: Resolved };
export type ComposerMode = 'run' | 'paused' | 'done' | 'desktop' | 'stopped';

export const ALREADY_ANSWERED = 'Sudah dijawab dari perangkat lain';

/** Jawaban kartu (id = indeks pertanyaan -> pilihan) jadi isi POST .../answer. Kunci = teks pertanyaan persis; multi-pilih = larik. */
export function questionAnswer(m: Msg, byIndex: Record<string, string[]>): AnswerRequestV2 {
  const answers: Record<string, string | string[]> = {};
  (m.questions ?? []).forEach((q, i) => {
    const picked = byIndex[String(i)] ?? [];
    if (picked.length) answers[q.question] = q.multiSelect ? picked : picked[0];
  });
  return { kind: 'question', answers };
}

/** 409 already_answered = kartu menciut "sudah dijawab"; galat lain = teks untuk alert. */
export function answerFailure(e: { status?: number; code?: string; message: string }): { resolved: boolean; text: string } {
  if (e.code === 'rule_not_allowed') return { resolved: false, text: RULE_NOT_ALLOWED };
  return e.code === 'already_answered' ? { resolved: true, text: ALREADY_ANSWERED } : { resolved: false, text: e.message };
}

export const RULE_NOT_ALLOWED = 'Aturan untuk alat ini tidak bisa disimpan karena berisiko. Setujui sekali saja.';

/** Isi POST .../answer untuk kartu izin. Alasan kosong tidak dikirim (alasan opsional, PRD F5). */
export function permissionAnswer(decision: 'allow' | 'deny' | 'always', reason?: string): AnswerRequestV2 {
  const r = reason?.trim();
  return { kind: 'permission', decision, ...(decision === 'deny' && r ? { reason: r } : {}) };
}

const clock = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };

/** Lanjutkan hanya untuk run gagal/terputus milik dashboard dan run terakhir proyek (ARCHITECTURE 6.2). */
export const canContinue = (run: Pick<Run, 'status' | 'origin'>, isLatest: boolean) =>
  isLatest && run.origin !== 'desktop' && (run.status === 'failed' || run.status === 'disconnected');

/** Kata status bar atas untuk run gagal/terputus/jeda limit; undefined = pakai kata bawaan. */
export function topBarStatusText(run: Pick<Run, 'status' | 'reason'>, limitResetAt: string | null): string | undefined {
  const why = (run.reason ?? '').slice(0, 80);
  if (run.status === 'failed') return why ? `Gagal: ${why}` : 'Gagal';
  if (run.status === 'disconnected') return 'Terputus: server berhenti saat run jalan';
  if (run.status === 'limit_paused') return limitResetAt ? `Jeda limit: lanjut sendiri pukul ${clock(limitResetAt)}` : 'Jeda limit: lanjut sendiri nanti';
  return undefined;
}

/** Pesan sistem penutup log untuk run gagal/terputus (blok merah + Lanjutkan) atau jeda limit (info, bukan masalah). */
export function runNotice(run: Pick<Run, 'id' | 'status' | 'reason' | 'lastLog'>, limitResetAt: string | null): PanelItem | null {
  if (run.status === 'failed' || run.status === 'disconnected') {
    const detail = [{ label: 'Alasan', value: run.reason || (run.status === 'disconnected' ? 'Server berhenti saat run jalan.' : 'Tidak diketahui.') }];
    if (run.lastLog) detail.push({ label: 'Log terakhir', value: run.lastLog });
    return { kind: 'system', id: `notice:${run.id}`, variant: 'bad', text: run.status === 'failed' ? 'Run gagal' : 'Run terputus', detail, continueRun: true };
  }
  if (run.status === 'limit_paused') {
    return { kind: 'system', id: `notice:${run.id}`, variant: 'limit', text: limitResetAt ? `Batas pemakaian tercapai. Lanjut sendiri pukul ${clock(limitResetAt)}.` : 'Batas pemakaian tercapai. Lanjut sendiri nanti.' };
  }
  return null;
}

export function composerMode(status: RunStatus, sessionId: string | null, origin: string | undefined): ComposerMode {
  if (origin === 'desktop') return 'desktop';
  if (status === 'paused') return 'paused';
  if (status === 'done' && sessionId) return 'done';
  if (['stopped', 'failed', 'disconnected', 'done'].includes(status)) return 'stopped';
  return 'run';
}

const ownerNote = (m: Msg) => (m.state === 'queued' ? 'Menunggu Lanjut' : m.sentOnResume ? 'Terkirim saat lanjut' : undefined);

/** Susun item panel Chat dari pesan + langkah alat. Kartu izin/milestone/keputusan belum dirender di sini (item ch05, bk06). */
export function panelItems(messages: Msg[], tools: ToolEvent[], conflicts: ReadonlySet<string> = new Set()): PanelItem[] {
  const out: PanelItem[] = [];
  for (const it of chatItems(messages, tools)) {
    if (it.type === 'steps') {
      out.push({ kind: 'tools', id: it.id, steps: it.tools.map((t) => ({ agent: t.agent ?? 'orkestrator', tool: t.name, summary: t.summary })) });
      continue;
    }
    const m = it.message;
    if (it.type === 'card') {
      if (m.kind !== 'question' && m.kind !== 'permission') continue;
      const resolved = it.status === 'pending' ? (conflicts.has(m.id) ? { text: ALREADY_ANSWERED, tone: 'cancel' as const } : undefined)
        : { text: it.summary, tone: it.status === 'cancelled' ? 'cancel' as const : 'ok' as const };
      if (m.kind === 'permission') {
        out.push({ kind: 'permission', id: m.id, from: 'orkestrator', tool: m.tool?.name ?? 'Alat', command: m.tool?.summary ?? m.text, why: m.tool?.why ?? '', resolved });
        continue;
      }
      out.push({
        kind: 'question', id: m.id, from: 'orkestrator', resolved,
        questions: (m.questions ?? []).map((q, i) => ({
          id: String(i), text: q.question, multi: q.multiSelect,
          options: q.options.map((o) => ({ label: o.label, description: o.description ?? undefined })),
        })),
      });
    } else if (m.kind === 'owner') out.push({ kind: 'user', id: m.id, text: m.text, pending: ownerNote(m) });
    else if (m.kind === 'agent') out.push({ kind: 'agent', id: m.id, from: 'orkestrator', body: m.text });
    else if (m.kind === 'system') {
      const ruleId = m.ref?.ruleId;
      out.push(ruleId ? { kind: 'system', id: m.id, variant: 'rule', text: m.text, ruleId } : { kind: 'system', id: m.id, variant: 'info', text: m.text });
    }
  }
  return out;
}
