// SQL entitas Fase 1 bagian 2 (bukti, aktivitas agent, aturan izin, push, notifikasi, pengaturan). Placeholder saja; tanpa DELETE.
import type { DatabaseSync } from 'node:sqlite';
import type { Tokens } from '../contract/index.js';
import type { ActivityRow, EvidenceRow, NotificationRow, PushSubRow, RuleRow } from './types.js';

type Row = Record<string, any>;
const tv = (t: Tokens) => [t.input, t.output, t.cacheRead, t.cacheWrite];

export function upsertEvidence(db: DatabaseSync, e: EvidenceRow): void {
  db.prepare(
    `INSERT INTO evidence (id, project_id, item_key, kind, path, caption, size, present, checked_at) VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, caption = excluded.caption, size = excluded.size, present = excluded.present, checked_at = excluded.checked_at`,
  ).run(e.id, e.projectId, e.itemKey, e.kind, e.path, e.caption, e.size, e.present ? 1 : 0, e.checkedAt);
}
const toEvidence = (r: Row): EvidenceRow => ({ id: r.id, projectId: r.project_id, itemKey: r.item_key, kind: r.kind, path: r.path, caption: r.caption, size: r.size, present: !!r.present, checkedAt: r.checked_at });
export const selectEvidence = (db: DatabaseSync, projectId: string, itemKey?: string) =>
  (itemKey === undefined
    ? db.prepare('SELECT * FROM evidence WHERE project_id = ? ORDER BY rowid').all(projectId)
    : db.prepare('SELECT * FROM evidence WHERE project_id = ? AND item_key = ? ORDER BY rowid').all(projectId, itemKey) as Row[]
  ).map((r) => toEvidence(r as Row));

export function upsertActivity(db: DatabaseSync, a: ActivityRow): void {
  db.prepare(
    `INSERT INTO agent_activity (id, run_id, session_id, agent, in_team, item_key, round, status, started_at, ended_at, model_used, tool_count, files, tok_input, tok_output, tok_cache_read, tok_cache_write) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET item_key = excluded.item_key, round = excluded.round, status = excluded.status, ended_at = excluded.ended_at, model_used = excluded.model_used, tool_count = excluded.tool_count, files = excluded.files,
       tok_input = excluded.tok_input, tok_output = excluded.tok_output, tok_cache_read = excluded.tok_cache_read, tok_cache_write = excluded.tok_cache_write`,
  ).run(a.id, a.runId, a.sessionId, a.agent, a.inTeam ? 1 : 0, a.itemKey, a.round, a.status, a.startedAt, a.endedAt, a.modelUsed, a.toolCount, JSON.stringify(a.files), ...tv(a.tokens));
}
const toActivity = (r: Row): ActivityRow => ({ id: r.id, runId: r.run_id, sessionId: r.session_id, agent: r.agent, inTeam: !!r.in_team, itemKey: r.item_key, round: r.round, status: r.status, startedAt: r.started_at, endedAt: r.ended_at, modelUsed: r.model_used, toolCount: r.tool_count, files: JSON.parse(r.files), tokens: { input: r.tok_input, output: r.tok_output, cacheRead: r.tok_cache_read, cacheWrite: r.tok_cache_write } });
export const selectActivities = (db: DatabaseSync, runId: string) => (db.prepare('SELECT * FROM agent_activity WHERE run_id = ? ORDER BY started_at, rowid').all(runId) as Row[]).map(toActivity);

export function upsertRule(db: DatabaseSync, r: RuleRow): void {
  db.prepare(
    `INSERT INTO permission_rules (id, project_id, tool, pattern, created_from, created_at, revoked_at) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET revoked_at = excluded.revoked_at`,
  ).run(r.id, r.projectId, r.tool, r.pattern, r.createdFrom, r.createdAt, r.revokedAt);
}
const toRule = (r: Row): RuleRow => ({ id: r.id, projectId: r.project_id, tool: r.tool, pattern: r.pattern, createdFrom: r.created_from, createdAt: r.created_at, revokedAt: r.revoked_at });
export const selectRules = (db: DatabaseSync, projectId: string, includeRevoked: boolean) =>
  (db.prepare(`SELECT * FROM permission_rules WHERE project_id = ? ${includeRevoked ? '' : 'AND revoked_at IS NULL'} ORDER BY rowid`).all(projectId) as Row[]).map(toRule);

export function upsertPushSub(db: DatabaseSync, s: PushSubRow): void {
  if (!/^https:\/\//.test(s.endpoint)) throw new Error('endpoint push harus https');
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, keys, label, created_at, last_ok_at, failures) VALUES (?,?,?,?,?,?)
     ON CONFLICT(endpoint) DO UPDATE SET keys = excluded.keys, label = excluded.label, last_ok_at = excluded.last_ok_at, failures = excluded.failures`,
  ).run(s.endpoint, JSON.stringify(s.keys), s.label, s.createdAt, s.lastOkAt, s.failures);
}
export const selectPushSubs = (db: DatabaseSync): PushSubRow[] =>
  (db.prepare('SELECT * FROM push_subscriptions ORDER BY rowid').all() as Row[]).map((r) => ({ endpoint: r.endpoint, keys: JSON.parse(r.keys), label: r.label, createdAt: r.created_at, lastOkAt: r.last_ok_at, failures: r.failures }));

export const selectNotification = (db: DatabaseSync, key: string): NotificationRow | undefined => {
  const r = db.prepare('SELECT * FROM notifications WHERE key = ?').get(key) as Row | undefined;
  return r && { key: r.key, runId: r.run_id, kind: r.kind, sentAt: r.sent_at, resolvedAt: r.resolved_at };
};
export function upsertNotification(db: DatabaseSync, n: NotificationRow): boolean {
  const isNew = !selectNotification(db, n.key);
  db.prepare(
    `INSERT INTO notifications (key, run_id, kind, sent_at, resolved_at) VALUES (?,?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET resolved_at = excluded.resolved_at`,
  ).run(n.key, n.runId, n.kind, n.sentAt, n.resolvedAt);
  return isNew;
}

export function upsertSetting(db: DatabaseSync, key: string, value: string): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}
export const selectSetting = (db: DatabaseSync, key: string): string | undefined =>
  (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as Row | undefined)?.value;
