// Papan proyek (UX 6.1): ringkasan per proyek dan angka total, dihitung dari Store. Hanya baca.
import path from 'node:path';
import type { Project, ProjectSummary, Run } from './contract/index.js';
import { projectId } from './projects.js';
import type { Store } from './store/index.js';

const ACTIVE = ['running', 'needs_owner', 'paused'];
const asRun = (r: Run | undefined) => r as (Run & { limitResetAt?: string | null; origin?: 'dashboard' | 'desktop' }) | undefined;

/** Proyek dikenal dari tabel projects dan dari run yang pernah ada. */
function known(store: Store): { id: string; path: string; name: string; teamId: string | null; batchSize: number | null; lastActivityAt: string | null }[] {
  const m = new Map<string, ReturnType<typeof known>[number]>();
  for (const p of store.listProjects()) m.set(p.id, p);
  for (const r of store.listRuns(undefined, 100000)) {
    const id = projectId(r.project);
    if (!m.has(id)) m.set(id, { id, path: r.project, name: r.projectName || path.basename(r.project), teamId: null, batchSize: null, lastActivityAt: null });
  }
  return [...m.values()];
}

export const findProject = (store: Store, id: string) => known(store).find((p) => p.id === id);

export function effectiveBatchSize(store: Store, defaultBatchSize: number, row?: { batchSize: number | null }): number {
  return row?.batchSize ?? (Number(store.getSetting('batchSize')) || defaultBatchSize);
}

export function summarize(store: Store, workRoot: string, p: ReturnType<typeof known>[number]): ProjectSummary {
  const run = asRun(store.listRuns(p.path, 1)[0]);
  const ms = store.listMilestones(p.id).find((m) => m.status === 'running' || m.status === 'ready_review');
  let milestone: ProjectSummary['milestone'] = null;
  if (ms) {
    const items = store.listItems(p.id).filter((i) => i.milestoneId === ms.id);
    const batches = run ? store.listBatches(run.id) : [];
    milestone = { name: ms.name, done: items.filter((i) => i.status === 'done').length, total: items.length || ms.initialItemCount, batch: batches.length ? `batch ${batches[batches.length - 1].number}` : null };
  }
  const pendingMsgs = run && run.pending > 0 ? store.listMessages(run.id).filter((m) => m.state === 'pending') : [];
  const oldest = pendingMsgs.map((m) => m.createdAt).sort()[0] ?? null;
  const live = run && ACTIVE.includes(run.status);
  const activeAgents = run && live ? [...new Set(store.listActivities(run.id).filter((a) => a.status === 'running').map((a) => a.agent))] : [];
  const last = [p.lastActivityAt, run?.endedAt, run?.startedAt].filter(Boolean).sort().pop() ?? null;
  return {
    id: p.id, name: p.name, relPath: path.relative(workRoot, p.path) || '.', path: p.path, origin: run?.origin ?? 'dashboard',
    status: run?.status ?? null, pending: run?.pending ?? 0, oldestPendingAt: oldest, milestone, activeAgents,
    tokens: run?.tokens ?? null, durationMs: run ? run.durationMs ?? (live ? Date.now() - Date.parse(run.startedAt) : null) : null,
    lastActivityAt: last, latestRunId: run?.id ?? null, limitResetAt: run?.status === 'limit_paused' ? run.limitResetAt ?? null : null, reason: run?.reason ?? null,
  };
}

export function detail(store: Store, workRoot: string, defaultBatchSize: number, p: ReturnType<typeof known>[number]): Project {
  const readyMilestoneId = store.listMilestones(p.id).find((m) => m.status === 'ready_review')?.id ?? null;
  return {
    ...summarize(store, workRoot, p), batchSize: effectiveBatchSize(store, defaultBatchSize, p), teamId: p.teamId,
    rules: store.listRules(p.id).map((r) => ({ id: r.id, tool: r.tool, pattern: r.pattern ?? '', createdAt: r.createdAt })), readyMilestoneId,
  };
}

/** Urutan UX 6.1: butuh kamu (tertua dulu), siap review, gagal/terputus, jalan, lalu sisanya menurut aktivitas terakhir. */
const rank = (s: ProjectSummary, ready: boolean) =>
  s.pending > 0 ? 0 : ready ? 1 : s.status === 'failed' || s.status === 'disconnected' ? 2 : s.status && ACTIVE.includes(s.status) ? 3 : 4;

export function buildBoard(store: Store, workRoot: string, maxRuns: number, recent?: number) {
  const readyIds = new Set(known(store).filter((p) => store.listMilestones(p.id).some((m) => m.status === 'ready_review')).map((p) => p.id));
  const rows = known(store).map((p) => ({ s: summarize(store, workRoot, p), ready: readyIds.has(p.id) }));
  rows.sort((a, b) => rank(a.s, a.ready) - rank(b.s, b.ready)
    || (rank(a.s, a.ready) === 0 ? (a.s.oldestPendingAt ?? '').localeCompare(b.s.oldestPendingAt ?? '') : (b.s.lastActivityAt ?? '').localeCompare(a.s.lastActivityAt ?? '')));
  const all = rows.map((r) => r.s);
  const resets = all.map((s) => s.limitResetAt).filter((x): x is string => !!x).sort();
  return {
    totals: {
      needsOwner: all.reduce((n, s) => n + s.pending, 0), readyReview: readyIds.size,
      active: all.filter((s) => s.status && ACTIVE.includes(s.status)).length, maxRuns,
      failed: all.filter((s) => s.status === 'failed' || s.status === 'disconnected').length,
      limitPaused: all.filter((s) => s.status === 'limit_paused').length, earliestReset: resets[0] ?? null,
    },
    projects: recent ? all.slice(0, recent) : all,
  };
}
