// Penyimpanan di balik satu modul (node:sqlite). Bagian lain hanya memakai kelas ini.
// Setiap tulisan run/pesan sekaligus menjadi event berurutan (seq) untuk SSE dan pemutaran ulang.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { TERMINAL_STATUSES, type Message, type Run, type RunEvent, type ToolEvent } from './contract.js';

export class Store {
  private db: DatabaseSync;
  private bus = new EventEmitter();

  constructor(file: string) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.migrate();
    this.bus.setMaxListeners(100);
  }

  // Migrasi berversi lewat PRAGMA user_version; tambah blok baru di bawah untuk perubahan skema.
  private migrate() {
    const v = (this.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    if (v < 1) {
      this.db.exec(`
        CREATE TABLE runs (id TEXT PRIMARY KEY, project TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, json TEXT NOT NULL);
        CREATE INDEX runs_project ON runs(project, started_at DESC);
        CREATE TABLE messages (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL);
        CREATE INDEX messages_run ON messages(run_id, created_at);
        CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, type TEXT NOT NULL, at TEXT NOT NULL, json TEXT NOT NULL);
        CREATE INDEX events_run ON events(run_id, seq);
        PRAGMA user_version = 1;
      `);
    }
  }

  private emit(runId: string, type: RunEvent['type'], data: unknown): RunEvent {
    const at = new Date().toISOString();
    const r = this.db.prepare('INSERT INTO events (run_id, type, at, json) VALUES (?, ?, ?, ?)').run(runId, type, at, JSON.stringify(data));
    const ev = { seq: Number(r.lastInsertRowid), runId, at, type, data } as RunEvent;
    this.bus.emit(runId, ev);
    return ev;
  }

  saveRun(run: Run): void {
    this.db
      .prepare(
        `INSERT INTO runs (id, project, status, started_at, json) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, json = excluded.json`,
      )
      .run(run.id, run.project, run.status, run.startedAt, JSON.stringify(run));
    this.emit(run.id, 'run', run);
  }

  getRun(id: string): Run | undefined {
    const row = this.db.prepare('SELECT json FROM runs WHERE id = ?').get(id) as { json: string } | undefined;
    return row && JSON.parse(row.json);
  }

  listRuns(project?: string, limit = 50): Run[] {
    const rows = (project
      ? this.db.prepare('SELECT json FROM runs WHERE project = ? ORDER BY started_at DESC LIMIT ?').all(project, limit)
      : this.db.prepare('SELECT json FROM runs ORDER BY started_at DESC LIMIT ?').all(limit)) as { json: string }[];
    return rows.map((r) => JSON.parse(r.json));
  }

  saveMessage(m: Message): void {
    this.db
      .prepare(
        `INSERT INTO messages (id, run_id, created_at, json) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET json = excluded.json`,
      )
      .run(m.id, m.runId, m.createdAt, JSON.stringify(m));
    this.emit(m.runId, 'message', m);
  }

  getMessage(id: string): Message | undefined {
    const row = this.db.prepare('SELECT json FROM messages WHERE id = ?').get(id) as { json: string } | undefined;
    return row && JSON.parse(row.json);
  }

  listMessages(runId: string): Message[] {
    const rows = this.db.prepare('SELECT json FROM messages WHERE run_id = ? ORDER BY created_at, rowid').all(runId) as { json: string }[];
    return rows.map((r) => JSON.parse(r.json));
  }

  addTool(runId: string, t: ToolEvent): void {
    this.emit(runId, 'tool', t);
  }

  eventsAfter(runId: string, after: number, limit = 5000): RunEvent[] {
    const rows = this.db
      .prepare('SELECT seq, run_id, type, at, json FROM events WHERE run_id = ? AND seq > ? ORDER BY seq LIMIT ?')
      .all(runId, after, limit) as { seq: number; run_id: string; type: RunEvent['type']; at: string; json: string }[];
    return rows.map((r) => ({ seq: r.seq, runId: r.run_id, at: r.at, type: r.type, data: JSON.parse(r.json) }) as RunEvent);
  }

  /** Replay lalu langganan dalam satu putaran sinkron, jadi tidak ada event yang terlewat di antaranya. */
  replayAndSubscribe(runId: string, after: number, fn: (e: RunEvent) => void): () => void {
    for (const e of this.eventsAfter(runId, after)) fn(e);
    this.bus.on(runId, fn);
    return () => this.bus.off(runId, fn);
  }

  /** Dipanggil saat server mulai: run yang masih "hidup" di data berarti prosesnya sudah tidak ada (Terputus). */
  markDisconnected(): number {
    let n = 0;
    for (const run of this.listRuns(undefined, 100000)) {
      if (TERMINAL_STATUSES.includes(run.status)) continue;
      for (const m of this.listMessages(run.id)) {
        if (m.state === 'pending' || m.state === 'queued') {
          this.saveMessage({ ...m, state: 'cancelled', answer: m.answer ?? { from: 'system', answers: null, decision: null, reason: null } });
        }
      }
      const endedAt = new Date().toISOString();
      this.saveRun({
        ...run, status: 'disconnected', pending: 0, endedAt, durationMs: Date.parse(endedAt) - Date.parse(run.startedAt),
        reason: 'Server dashboard berhenti atau dimulai ulang saat run berjalan.',
      });
      n++;
    }
    return n;
  }

  close() {
    this.db.close();
  }
}
