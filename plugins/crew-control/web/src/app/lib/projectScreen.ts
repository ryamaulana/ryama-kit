// Logika murni layar proyek: data run -> props bar atas dan kolom agent (UX 6.2, PRD F4).
import { TERMINAL_STATUSES } from '../../../../src/contract/common.js';
import type { Run } from '../../../../src/contract/runs.js';
import { AGENT_STATUS_LABEL, type AgentState, type AgentStatus } from './agentStates.js';
import { countTokens, formatDuration, formatTokens, formatNumber } from './format.js';
import type { AgentActivity } from './types.js';

export type Phase = 'run' | 'paused' | 'stopped' | 'ask';
type RunLike = Pick<Run, 'status' | 'pending' | 'tokens' | 'durationMs' | 'startedAt'> & { milestone?: { name: string; done: number; total: number } | null; batchNo?: number | null };

export function phaseOf(run: Pick<Run, 'status' | 'pending'>): Phase {
  if (TERMINAL_STATUSES.includes(run.status)) return 'stopped';
  if (run.status === 'paused' || run.status === 'limit_paused') return 'paused';
  return run.pending > 0 || run.status === 'needs_owner' ? 'ask' : 'run';
}

/** Angka bar atas. Token = input + output + cache tulis (UX 11); durasi berjalan dihitung dari startedAt bila run belum berakhir. */
export function topBarStats(run: RunLike, now: number) {
  const total = run.tokens ? countTokens(run.tokens) : 0;
  const ms = run.durationMs ?? Math.max(0, now - Date.parse(run.startedAt));
  return {
    tokens: run.tokens ? `${formatTokens(total)} token` : undefined,
    tokensTitle: run.tokens ? `${formatNumber(total)} token` : undefined,
    duration: formatDuration(ms),
    waiting: run.pending,
    milestone: run.milestone
      ? { name: run.milestone.name, done: run.milestone.done, total: run.milestone.total, batch: run.batchNo ? `batch ${run.batchNo}` : undefined }
      : undefined,
  };
}

const DOT: Record<AgentStatus, 'ask' | 'bad' | 'run' | 'done' | 'ready' | 'skipped'> =
  { needs_owner: 'ask', failed: 'bad', running: 'run', done: 'done', idle: 'ready', skipped: 'skipped' };

/** Baris kolom agent; "Jalan · putaran N" bila lebih dari 1 putaran, item dari activity terbaru. */
export function agentRows(states: AgentState[], activities: AgentActivity[] & { itemKey?: string | null }[]) {
  const item = new Map<string, string>();
  for (const a of [...activities].sort((x, y) => x.startedAt.localeCompare(y.startedAt))) {
    const k = (a as { itemKey?: string | null }).itemKey;
    if (k) item.set(a.agent, k);
  }
  return states.map((s) => ({
    id: s.id, name: s.name, status: DOT[s.status],
    statusText: s.round > 1 ? `${AGENT_STATUS_LABEL[s.status]} · putaran ${s.round}` : undefined,
    item: item.get(s.id),
  }));
}

/** Jeda sambung ulang SSE: 1, 2, 4, 8 dtk, maksimum 15. */
export const backoffMs = (attempt: number): number => Math.min(15_000, 1000 * 2 ** attempt);
