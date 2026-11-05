// Semua SQL Store di satu tempat; parameter selalu lewat placeholder.
import type { DatabaseSync } from 'node:sqlite';
import type { Message, MessageV2, Run, RunEvent } from '../contract/index.js';

export function insertEvent(db: DatabaseSync, runId: string, type: string, at: string, data: unknown): number {
  const r = db.prepare('INSERT INTO events (run_id, type, at, json) VALUES (?, ?, ?, ?)').run(runId, type, at, JSON.stringify(data));
  return Number(r.lastInsertRowid);
}

export function upsertRun(db: DatabaseSync, run: Run): void {
  db.prepare(
    `INSERT INTO runs (id, project, status, started_at, json) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status, json = excluded.json`,
  ).run(run.id, run.project, run.status, run.startedAt, JSON.stringify(run));
}

export function selectRun(db: DatabaseSync, id: string): Run | undefined {
  const row = db.prepare('SELECT json FROM runs WHERE id = ?').get(id) as { json: string } | undefined;
  return row && JSON.parse(row.json);
}

export function selectRuns(db: DatabaseSync, project: string | undefined, limit: number): Run[] {
  const rows = (project
    ? db.prepare('SELECT json FROM runs WHERE project = ? ORDER BY started_at DESC LIMIT ?').all(project, limit)
    : db.prepare('SELECT json FROM runs ORDER BY started_at DESC LIMIT ?').all(limit)) as { json: string }[];
  return rows.map((r) => JSON.parse(r.json));
}

export function selectActiveRuns(db: DatabaseSync): { run: Run; origin: string }[] {
  const rows = db.prepare("SELECT json, origin FROM runs WHERE status NOT IN ('stopped', 'failed', 'done', 'disconnected')").all() as { json: string; origin: string }[];
  return rows.map((r) => ({ run: JSON.parse(r.json), origin: r.origin }));
}

export function upsertMessage(db: DatabaseSync, m: Message | MessageV2): void {
  const ref = 'ref' in m ? m.ref : null;
  db.prepare(
    `INSERT INTO messages (id, run_id, created_at, json, kind, state, answered_at, ref_item, ref_milestone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json, state = excluded.state, answered_at = excluded.answered_at, ref_item = excluded.ref_item, ref_milestone = excluded.ref_milestone`,
  ).run(m.id, m.runId, m.createdAt, JSON.stringify(m), m.kind, m.state, m.answeredAt, ref?.itemId ?? null, ref?.milestoneId ?? null);
}

export function selectMessage(db: DatabaseSync, id: string): Message | undefined {
  const row = db.prepare('SELECT json FROM messages WHERE id = ?').get(id) as { json: string } | undefined;
  return row && JSON.parse(row.json);
}

export function selectMessages(db: DatabaseSync, runId: string): Message[] {
  const rows = db.prepare('SELECT json FROM messages WHERE run_id = ? ORDER BY created_at, rowid').all(runId) as { json: string }[];
  return rows.map((r) => JSON.parse(r.json));
}

export function selectEventsAfter(db: DatabaseSync, runId: string, after: number, limit: number): RunEvent[] {
  const rows = db
    .prepare('SELECT seq, run_id, type, at, json FROM events WHERE run_id = ? AND seq > ? ORDER BY seq LIMIT ?')
    .all(runId, after, limit) as { seq: number; run_id: string; type: RunEvent['type']; at: string; json: string }[];
  return rows.map((r) => ({ seq: r.seq, runId: r.run_id, at: r.at, type: r.type, data: JSON.parse(r.json) }) as RunEvent);
}
