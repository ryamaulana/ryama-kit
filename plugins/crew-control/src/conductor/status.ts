// Mesin status run (ARCHITECTURE 5 "Status run"). Murni: dipakai Conductor (transisi, kapasitas) dan Harness (status saat sesi hidup).
import type { Run, RunStatus } from '../contract/index.js';

const LIVE: RunStatus[] = ['running', 'paused', 'needs_owner'];
const END: RunStatus[] = ['done', 'failed', 'stopped', 'disconnected'];

/** Dari status -> status tujuan yang sah. `null` = run baru. */
const NEXT: Record<RunStatus | 'new', RunStatus[]> = {
  new: ['running', 'needs_owner'], // needs_owner tanpa sesi: usulan milestone/keputusan menunggu
  running: ['paused', 'needs_owner', 'limit_paused', 'ready_review', ...END],
  paused: ['running', 'needs_owner', ...END],
  needs_owner: ['running', 'paused', 'limit_paused', 'ready_review', ...END],
  limit_paused: ['running', 'stopped', 'failed', 'disconnected'],
  ready_review: ['running', 'done', 'stopped'],
  done: ['running'], // ketik-lanjut run terakhir (A13)
  failed: ['running'], // Lanjutkan
  disconnected: ['running'], // Lanjutkan
  stopped: [], // baca saja
};

export const canTransition = (from: RunStatus | null, to: RunStatus): boolean => NEXT[from ?? 'new'].includes(to);

/** Status tampilan saat ada sesi: paused > needs_owner > running. */
export const liveStatus = (s: { paused: boolean; pending: number }): RunStatus =>
  s.paused ? 'paused' : s.pending ? 'needs_owner' : 'running';

/** Memakai jatah CREW_MAX_RUNS: punya (atau akan punya lagi, limit_paused) proses claude. ready_review dan needs_owner tanpa sesi tidak. */
export const usesCapacity = (r: Pick<Run, 'status' | 'sessionId'>): boolean =>
  r.status === 'limit_paused' || (LIVE.includes(r.status) && (r.status !== 'needs_owner' || !!r.sessionId));
