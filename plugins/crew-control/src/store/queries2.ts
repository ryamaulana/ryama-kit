// SQL entitas v2 (parameter selalu lewat placeholder). Tanpa DELETE.
import type { DatabaseSync } from 'node:sqlite';
import type { Run, Tokens } from '../contract/index.js';
import type { BatchRow, ItemRow, MilestoneRow, ProjectRow, RunMeta, SessionRow } from './types.js';

type Row = Record<string, any>;
const T = (r: Row): Tokens => ({ input: r.tok_input, output: r.tok_output, cacheRead: r.tok_cache_read, cacheWrite: r.tok_cache_write });
const tv = (t: Tokens) => [t.input, t.output, t.cacheRead, t.cacheWrite];
const TOK_COLS = 'tok_input = excluded.tok_input, tok_output = excluded.tok_output, tok_cache_read = excluded.tok_cache_read, tok_cache_write = excluded.tok_cache_write';

export function upsertRunMeta(db: DatabaseSync, run: Run, meta: RunMeta): void {
  // COALESCE: simpan ulang tanpa meta tidak menimpa kolom yang sudah terisi.
  db.prepare(
    `UPDATE runs SET model = ?, ended_at = ?, project_id = COALESCE(?, project_id), team_id = COALESCE(?, team_id),
       command_id = COALESCE(?, command_id), title = COALESCE(?, title), origin = COALESCE(?, origin) WHERE id = ?`,
  ).run(run.model, run.endedAt, meta.projectId ?? null, meta.teamId ?? null, meta.commandId ?? null, meta.title ?? null, meta.origin ?? null, run.id);
}

export function upsertProject(db: DatabaseSync, p: ProjectRow): void {
  db.prepare(
    `INSERT INTO projects (id, path, name, team_id, batch_size, last_command_id, last_activity_at, json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET path = excluded.path, name = excluded.name, team_id = excluded.team_id, batch_size = excluded.batch_size,
       last_command_id = excluded.last_command_id, last_activity_at = excluded.last_activity_at, json = excluded.json`,
  ).run(p.id, p.path, p.name, p.teamId, p.batchSize, p.lastCommandId, p.lastActivityAt, JSON.stringify(p));
}
export const selectProject = (db: DatabaseSync, id: string): ProjectRow | undefined => {
  const r = db.prepare('SELECT json FROM projects WHERE id = ?').get(id) as Row | undefined;
  return r && JSON.parse(r.json);
};
export const selectProjects = (db: DatabaseSync): ProjectRow[] =>
  (db.prepare("SELECT json FROM projects ORDER BY COALESCE(last_activity_at, '') DESC, id").all() as Row[]).map((r) => JSON.parse(r.json));

export function upsertSession(db: DatabaseSync, s: SessionRow): void {
  db.prepare(
    `INSERT INTO sessions (id, run_id, batch_id, kind, started_at, ended_at, "end", model_used, tok_input, tok_output, tok_cache_read, tok_cache_write) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET batch_id = excluded.batch_id, ended_at = excluded.ended_at, "end" = excluded."end", model_used = excluded.model_used, ${TOK_COLS}`,
  ).run(s.id, s.runId, s.batchId, s.kind, s.startedAt, s.endedAt, s.end, s.modelUsed, ...tv(s.tokens));
}
const toSession = (r: Row): SessionRow => ({ id: r.id, runId: r.run_id, batchId: r.batch_id, kind: r.kind, startedAt: r.started_at, endedAt: r.ended_at, end: r.end, modelUsed: r.model_used, tokens: T(r) });
export const selectSession = (db: DatabaseSync, id: string) => { const r = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Row | undefined; return r && toSession(r); };
export const selectSessions = (db: DatabaseSync, runId: string) => (db.prepare('SELECT * FROM sessions WHERE run_id = ? ORDER BY started_at, rowid').all(runId) as Row[]).map(toSession);

export function upsertMilestone(db: DatabaseSync, m: MilestoneRow): void {
  db.prepare(
    `INSERT INTO milestones (id, project_id, backlog_key, name, kind, status, review_round, run_id, initial_item_count, proposed_at, approved_at, running_at, ready_review_at, accepted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind, status = excluded.status, review_round = excluded.review_round, run_id = excluded.run_id,
       initial_item_count = excluded.initial_item_count, proposed_at = excluded.proposed_at, approved_at = excluded.approved_at, running_at = excluded.running_at,
       ready_review_at = excluded.ready_review_at, accepted_at = excluded.accepted_at`,
  ).run(m.id, m.projectId, m.backlogKey, m.name, m.kind, m.status, m.reviewRound, m.runId, m.initialItemCount, m.proposedAt, m.approvedAt, m.runningAt, m.readyReviewAt, m.acceptedAt);
}
const toMilestone = (r: Row): MilestoneRow => ({ id: r.id, projectId: r.project_id, backlogKey: r.backlog_key, name: r.name, kind: r.kind, status: r.status, reviewRound: r.review_round, runId: r.run_id, initialItemCount: r.initial_item_count, proposedAt: r.proposed_at, approvedAt: r.approved_at, runningAt: r.running_at, readyReviewAt: r.ready_review_at, acceptedAt: r.accepted_at });
export const selectMilestone = (db: DatabaseSync, id: string) => { const r = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id) as Row | undefined; return r && toMilestone(r); };
export const selectMilestones = (db: DatabaseSync, projectId: string) => (db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY rowid').all(projectId) as Row[]).map(toMilestone);

export function upsertBatch(db: DatabaseSync, b: BatchRow): void {
  db.prepare(
    `INSERT INTO batches (id, run_id, milestone_id, number, session_id, item_keys, commit_hash, commit_error, started_at, ended_at, tok_input, tok_output, tok_cache_read, tok_cache_write) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET milestone_id = excluded.milestone_id, session_id = excluded.session_id, item_keys = excluded.item_keys, commit_hash = excluded.commit_hash,
       commit_error = excluded.commit_error, ended_at = excluded.ended_at, ${TOK_COLS}`,
  ).run(b.id, b.runId, b.milestoneId, b.number, b.sessionId, JSON.stringify(b.itemKeys), b.commitHash, b.commitError, b.startedAt, b.endedAt, ...tv(b.tokens));
}
const toBatch = (r: Row): BatchRow => ({ id: r.id, runId: r.run_id, milestoneId: r.milestone_id, number: r.number, sessionId: r.session_id, itemKeys: JSON.parse(r.item_keys), commitHash: r.commit_hash, commitError: r.commit_error, startedAt: r.started_at, endedAt: r.ended_at, tokens: T(r) });
export const selectBatches = (db: DatabaseSync, runId: string) => (db.prepare('SELECT * FROM batches WHERE run_id = ? ORDER BY number').all(runId) as Row[]).map(toBatch);

export function upsertItem(db: DatabaseSync, i: ItemRow): void {
  db.prepare(
    `INSERT INTO items (project_id, item_key, milestone_id, title, agent, type, status, attempts, origin, fix_of, first_seen_at, done_at, done_batch_id, tok_input, tok_output, tok_cache_read, tok_cache_write) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(project_id, item_key) DO UPDATE SET milestone_id = excluded.milestone_id, title = excluded.title, agent = excluded.agent, type = excluded.type, status = excluded.status,
       attempts = excluded.attempts, origin = excluded.origin, fix_of = excluded.fix_of, done_at = excluded.done_at, done_batch_id = excluded.done_batch_id, ${TOK_COLS}`,
  ).run(i.projectId, i.itemKey, i.milestoneId, i.title, i.agent, i.type, i.status, i.attempts, i.origin, i.fixOf, i.firstSeenAt, i.doneAt, i.doneBatchId, ...tv(i.tokens));
}
const toItem = (r: Row): ItemRow => ({ projectId: r.project_id, itemKey: r.item_key, milestoneId: r.milestone_id, title: r.title, agent: r.agent, type: r.type, status: r.status, attempts: r.attempts, origin: r.origin, fixOf: r.fix_of, firstSeenAt: r.first_seen_at, doneAt: r.done_at, doneBatchId: r.done_batch_id, tokens: T(r) });
export const selectItems = (db: DatabaseSync, projectId: string) => (db.prepare('SELECT * FROM items WHERE project_id = ? ORDER BY rowid').all(projectId) as Row[]).map(toItem);
