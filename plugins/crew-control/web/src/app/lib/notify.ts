// Pemberitahuan Fase 1 (PRD F6): judul tab + bunyi. Logika murni; efek samping ada di hooks/useNotify.ts.
import type { ProjectSummary } from '../../../../src/contract/projects.js';

export const SOUND_KEY = 'crew.sound';
export const parseSound = (v: string | null): boolean => v !== 'off'; // bawaan hidup

type Snap = Map<string, { pending: number; fail: string | null }>;
export type Trigger = { projectId: string; kind: 'pending' | 'failed' | 'limit' };

// Kunci keadaan "bermasalah" per run: berubah hanya saat run/status berganti, jadi tidak berulang tiap polling.
const failKey = (p: ProjectSummary): string | null =>
  p.status === 'failed' || p.status === 'disconnected' || p.status === 'limit_paused' ? `${p.latestRunId}:${p.status}` : null;

export const snapshot = (projects: ProjectSummary[]): Snap =>
  new Map(projects.map((p) => [p.id, { pending: p.pending, fail: failKey(p) }]));

/** Pemicu baru dibanding snapshot sebelumnya. prev=null (muatan pertama): tidak ada pemicu, hanya baseline. */
export function newTriggers(prev: Snap | null, projects: ProjectSummary[]): Trigger[] {
  if (!prev) return [];
  const out: Trigger[] = [];
  for (const p of projects) {
    const before = prev.get(p.id);
    if (p.pending > (before?.pending ?? 0)) out.push({ projectId: p.id, kind: 'pending' });
    const f = failKey(p);
    if (f && f !== before?.fail) out.push({ projectId: p.id, kind: p.status === 'limit_paused' ? 'limit' : 'failed' });
  }
  return out;
}

/** `(N) Butuh kamu · <proyek>` (proyek = yang pertanyaannya paling lama menunggu); tanpa N: judul dasar. */
export function tabTitle(projects: ProjectSummary[], base = 'Crew Control'): string {
  const waiting = projects.filter((p) => p.pending > 0);
  if (!waiting.length) return base;
  const oldest = waiting.reduce((a, b) => ((b.oldestPendingAt ?? '') < (a.oldestPendingAt ?? '') ? b : a));
  return `(${waiting.reduce((n, p) => n + p.pending, 0)}) Butuh kamu · ${oldest.name}`;
}
