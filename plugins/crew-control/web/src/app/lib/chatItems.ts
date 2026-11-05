import type { Message, MessageV2, ToolEvent } from '../../../../src/contract/messages.js';

type Msg = MessageV2 | Message;
export type ChatItem =
  | { type: 'steps'; id: string; tools: ToolEvent[] }
  | { type: 'message'; id: string; message: Msg }
  // kartu interaktif: pending = bisa dijawab; answered/cancelled = kartu terjawab ringkas
  | { type: 'card'; id: string; message: Msg; status: 'pending' | 'answered' | 'cancelled'; summary: string };

const CARD_KINDS = new Set(['question', 'permission', 'decision', 'milestone']);

/** Ringkas jawaban tersimpan jadi satu baris untuk kartu terjawab. */
export function describeAnswer(m: Msg): string {
  const a = m.answer;
  if (!a) return '';
  const who: Record<string, string> = { dashboard: 'kamu', agent: 'agent membatalkan', system: 'run berakhir' };
  if (m.state === 'cancelled') return `Dibatalkan (${who[a.from] ?? a.from})`;
  if (a.decision) return `${a.decision === 'allow' ? 'Disetujui' : 'Ditolak'}${a.reason ? `: ${a.reason}` : ''}`;
  return Object.entries(a.answers ?? {}).map(([q, v]) => `${q} → ${v}`).join('; ');
}

/**
 * Susun riwayat Chat urut waktu: langkah alat berurutan digabung jadi satu baris `steps`,
 * pertanyaan/izin yang sudah dijawab atau dibatalkan jadi kartu ringkas. Waktu sama = pesan dulu.
 */
export function chatItems(messages: Msg[], tools: ToolEvent[]): ChatItem[] {
  const merged = [
    ...messages.map((m, i) => ({ t: Date.parse(m.createdAt), pri: 0, i, m })),
    ...tools.map((tool, i) => ({ t: Date.parse(tool.at), pri: 1, i, tool })),
  ].sort((a, b) => a.t - b.t || a.pri - b.pri || a.i - b.i);
  const out: ChatItem[] = [];
  for (const e of merged) {
    if ('tool' in e) {
      const last = out[out.length - 1];
      if (last?.type === 'steps') last.tools.push(e.tool);
      else out.push({ type: 'steps', id: `steps:${e.i}`, tools: [e.tool] });
    } else if (CARD_KINDS.has(e.m.kind) && (e.m.state === 'pending' || e.m.state === 'answered' || e.m.state === 'cancelled')) {
      const status = e.m.state;
      out.push({ type: 'card', id: e.m.id, message: e.m, status, summary: status === 'pending' ? '' : describeAnswer(e.m) });
    } else out.push({ type: 'message', id: e.m.id, message: e.m });
  }
  return out;
}
