import type { DatabaseSync } from 'node:sqlite';

// Migrasi berversi lewat PRAGMA user_version; tambah blok baru di bawah untuk perubahan skema.
export function migrate(db: DatabaseSync): void {
  const v = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (v < 1) {
    db.exec(`
      CREATE TABLE runs (id TEXT PRIMARY KEY, project TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, json TEXT NOT NULL);
      CREATE INDEX runs_project ON runs(project, started_at DESC);
      CREATE TABLE messages (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL);
      CREATE INDEX messages_run ON messages(run_id, created_at);
      CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, type TEXT NOT NULL, at TEXT NOT NULL, json TEXT NOT NULL);
      CREATE INDEX events_run ON events(run_id, seq);
      PRAGMA user_version = 1;
    `);
  }
  if (v < 2) {
    const tok = 'tok_input INTEGER NOT NULL DEFAULT 0, tok_output INTEGER NOT NULL DEFAULT 0, tok_cache_read INTEGER NOT NULL DEFAULT 0, tok_cache_write INTEGER NOT NULL DEFAULT 0';
    // Tanpa DROP/DELETE: baris v1 tetap, kolom baru berisi nilai bawaan.
    db.exec(`
      BEGIN;
      CREATE TABLE projects (id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, name TEXT NOT NULL, team_id TEXT, batch_size INTEGER, last_command_id TEXT, last_activity_at TEXT, json TEXT NOT NULL DEFAULT '{}');
      ALTER TABLE runs ADD COLUMN project_id TEXT;
      ALTER TABLE runs ADD COLUMN team_id TEXT;
      ALTER TABLE runs ADD COLUMN command_id TEXT;
      ALTER TABLE runs ADD COLUMN origin TEXT NOT NULL DEFAULT 'dashboard';
      ALTER TABLE runs ADD COLUMN model TEXT;
      ALTER TABLE runs ADD COLUMN title TEXT NOT NULL DEFAULT '';
      ALTER TABLE runs ADD COLUMN ended_at TEXT;
      CREATE INDEX runs_project_id ON runs(project_id, started_at DESC);
      CREATE INDEX runs_status ON runs(status);
      CREATE TABLE sessions (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, batch_id TEXT, kind TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, "end" TEXT, model_used TEXT, ${tok});
      CREATE INDEX sessions_run ON sessions(run_id, started_at);
      CREATE TABLE milestones (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, backlog_key TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, review_round INTEGER NOT NULL DEFAULT 0, run_id TEXT, initial_item_count INTEGER NOT NULL DEFAULT 0, proposed_at TEXT, approved_at TEXT, running_at TEXT, ready_review_at TEXT, accepted_at TEXT, UNIQUE (project_id, backlog_key));
      CREATE UNIQUE INDEX milestones_one_active ON milestones(project_id) WHERE status IN ('running', 'ready_review');
      CREATE TABLE batches (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, milestone_id TEXT, number INTEGER NOT NULL, session_id TEXT, item_keys TEXT NOT NULL DEFAULT '[]', commit_hash TEXT, commit_error TEXT, started_at TEXT NOT NULL, ended_at TEXT, ${tok}, UNIQUE (run_id, number));
      CREATE INDEX batches_milestone ON batches(milestone_id);
      CREATE TABLE items (project_id TEXT NOT NULL, item_key TEXT NOT NULL, milestone_id TEXT, title TEXT NOT NULL, agent TEXT, type TEXT, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, origin TEXT NOT NULL DEFAULT 'asli', fix_of TEXT, first_seen_at TEXT NOT NULL, done_at TEXT, done_batch_id TEXT, ${tok}, PRIMARY KEY (project_id, item_key));
      CREATE INDEX items_milestone ON items(milestone_id);
      PRAGMA user_version = 2;
      COMMIT;
    `);
  }
  if (v < 3) {
    const tok = 'tok_input INTEGER NOT NULL DEFAULT 0, tok_output INTEGER NOT NULL DEFAULT 0, tok_cache_read INTEGER NOT NULL DEFAULT 0, tok_cache_write INTEGER NOT NULL DEFAULT 0';
    // Aditif saja; kolom baru messages diisi dari json lama supaya baris v1/v2 tetap terbaca.
    db.exec(`
      BEGIN;
      ALTER TABLE messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'agent';
      ALTER TABLE messages ADD COLUMN state TEXT;
      ALTER TABLE messages ADD COLUMN answered_at TEXT;
      ALTER TABLE messages ADD COLUMN ref_item TEXT;
      ALTER TABLE messages ADD COLUMN ref_milestone TEXT;
      UPDATE messages SET kind = COALESCE(json_extract(json, '$.kind'), 'agent'), state = json_extract(json, '$.state'), answered_at = json_extract(json, '$.answeredAt');
      CREATE TABLE evidence (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, item_key TEXT NOT NULL, kind TEXT NOT NULL, path TEXT NOT NULL, caption TEXT NOT NULL, size INTEGER NOT NULL DEFAULT 0, present INTEGER NOT NULL DEFAULT 1, checked_at TEXT NOT NULL);
      CREATE INDEX evidence_item ON evidence(project_id, item_key);
      CREATE TABLE agent_activity (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, session_id TEXT NOT NULL, agent TEXT NOT NULL, in_team INTEGER NOT NULL DEFAULT 1, item_key TEXT, round INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, model_used TEXT, tool_count INTEGER NOT NULL DEFAULT 0, files TEXT NOT NULL DEFAULT '[]', ${tok});
      CREATE INDEX agent_activity_run ON agent_activity(run_id, started_at);
      CREATE INDEX agent_activity_session ON agent_activity(session_id);
      CREATE TABLE permission_rules (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, tool TEXT NOT NULL, pattern TEXT, created_from TEXT, created_at TEXT NOT NULL, revoked_at TEXT);
      CREATE INDEX permission_rules_project ON permission_rules(project_id);
      CREATE TABLE push_subscriptions (endpoint TEXT PRIMARY KEY, keys TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, last_ok_at TEXT, failures INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE notifications (key TEXT PRIMARY KEY, run_id TEXT NOT NULL, kind TEXT NOT NULL, sent_at TEXT NOT NULL, resolved_at TEXT);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      PRAGMA user_version = 3;
      COMMIT;
    `);
  }
}
