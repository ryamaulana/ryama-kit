import type { ProjectSummary } from '../../../../src/contract/projects.js';
import { formatDuration, formatTokens, countTokens } from './format.js';

// Tipe tampilan disalin struktural (lib murni tidak menarik .tsx ke tes).
type Board = { totals: { needsOwner: number; readyReview: number; active: number; maxRuns: number; failed: number; limitPaused: number; earliestReset: string | null }; projects: ProjectSummary[] };
type Row = {
  id: string; name: string; path: string; href: string; state: 'ask' | 'bad' | 'run' | 'limit' | 'done' | 'stopped' | 'ready';
  stateLabel: string; pending?: number; detail?: string; fromDesktop?: boolean;
  milestone?: { name: string; done: number; total: number; batch?: string }; runLine?: string; runMeta?: string; when: string;
  action?: { kind: 'answer' | 'review'; href: string }; canResume?: boolean; reason?: string;
};

const hhmm = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
/** "10.42" hari ini, "Kemarin 16.20", selain itu tanggal. */
export function formatWhen(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  const day = (x: Date) => Math.floor(new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 864e5);
  const diff = day(now) - day(d);
  if (diff === 0) return hhmm(d);
  if (diff === 1) return `Kemarin ${hhmm(d)}`;
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${hhmm(d)}`;
}

const LABEL = { running: 'Jalan', paused: 'Jeda', limit_paused: 'Jeda limit', failed: 'Gagal', disconnected: 'Terputus', done: 'Selesai', stopped: 'Dihentikan' } as const;
const STATE = { running: 'run', paused: 'run', limit_paused: 'limit', failed: 'bad', disconnected: 'bad', done: 'done', stopped: 'stopped' } as const;

export function toRow(p: ProjectSummary, now = new Date()): Row {
  const asking = p.pending > 0 || p.status === 'needs_owner';
  const s = p.status;
  const state = asking ? 'ask' : s && s !== 'ready_review' && s !== 'needs_owner' ? STATE[s] : 'ready';
  const stateLabel = asking ? 'Butuh kamu' : s && s !== 'ready_review' && s !== 'needs_owner' ? LABEL[s] : 'Belum ada run';
  const resumable = !asking && (s === 'failed' || s === 'disconnected');
  const meta = [p.tokens ? `${formatTokens(countTokens(p.tokens))} token` : '', p.durationMs != null ? formatDuration(p.durationMs) : ''].filter(Boolean).join(' · ');
  return {
    id: p.id, name: p.name, path: p.relPath.split('/').join(' › '), href: `/proyek/${p.id}`, state, stateLabel,
    pending: p.pending > 0 ? p.pending : undefined, fromDesktop: p.origin === 'desktop' || undefined,
    milestone: p.milestone ? { name: p.milestone.name, done: p.milestone.done, total: p.milestone.total, batch: p.milestone.batch ?? undefined } : undefined,
    runLine: p.activeAgents.length ? `${p.activeAgents.join(', ')} jalan` : undefined, runMeta: meta || undefined,
    when: formatWhen(p.lastActivityAt, now),
    // Butuh kamu -> Layar proyek, Chat tergulir ke kartu tertua (?kartu=tertua dibaca Layar proyek).
    action: asking ? { kind: 'answer', href: `/proyek/${p.id}?kartu=tertua` } : undefined,
    canResume: resumable || undefined, reason: resumable ? p.reason ?? undefined : undefined,
  };
}

/** Papan -> kelompok tampilan. Fase 1: Siap review tidak ditampilkan (angka dipaksa 0, status ready_review jatuh ke diam). */
export function groupBoard(board: Board, now = new Date()) {
  const rows = board.projects.map((p) => ({ p, r: toRow(p, now) }));
  const byTime = (a: ProjectSummary, b: ProjectSummary) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? '');
  const ask = rows.filter(({ r }) => r.state === 'ask').sort((a, b) => (a.p.oldestPendingAt ?? '9').localeCompare(b.p.oldestPendingAt ?? '9'));
  const bad = rows.filter(({ r }) => r.state === 'bad').sort((a, b) => byTime(a.p, b.p));
  const pick = (f: (r: Row) => boolean) => rows.filter(({ r }) => f(r)).sort((a, b) => byTime(a.p, b.p)).map(({ r }) => r);
  return {
    totals: { needsYou: board.totals.needsOwner, readyReview: 0, active: board.totals.active, maxRuns: board.totals.maxRuns, failed: board.totals.failed, limitPaused: board.totals.limitPaused, earliestReset: board.totals.earliestReset ? formatWhen(board.totals.earliestReset, now) : null },
    attention: [...ask, ...bad].map(({ r }) => r),
    running: pick((r) => r.state === 'run'), limited: pick((r) => r.state === 'limit'),
    quiet: pick((r) => r.state === 'done' || r.state === 'stopped' || r.state === 'ready'),
  };
}
