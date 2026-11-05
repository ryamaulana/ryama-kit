// Penyimpanan di balik satu modul (node:sqlite). Bagian lain hanya memakai kelas ini.
// Setiap tulisan run/pesan sekaligus menjadi event berurutan (seq) untuk SSE dan pemutaran ulang.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { TERMINAL_STATUSES, type Message, type Run, type RunEvent, type ToolEvent } from '../contract/index.js';
import { migrate } from './migrations.js';
import * as q from './queries.js';
import * as q2 from './queries2.js';
import type { BatchRow, ItemRow, MilestoneRow, ProjectRow, RunMeta, SessionRow } from './types.js';
export type * from './types.js';

export class Store {
  private db: DatabaseSync;
  private bus = new EventEmitter();

  constructor(file: string) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL');
    migrate(this.db);
    this.bus.setMaxListeners(100);
  }

  private emit(runId: string, type: RunEvent['type'], data: unknown): RunEvent {
    const at = new Date().toISOString();
    const ev = { seq: q.insertEvent(this.db, runId, type, at, data), runId, at, type, data } as RunEvent;
    this.bus.emit(runId, ev);
    return ev;
  }

  saveRun(run: Run, meta: RunMeta = {}): void {
    q.upsertRun(this.db, run);
    q2.upsertRunMeta(this.db, run, meta);
    this.emit(run.id, 'run', run);
  }

  getRun(id: string): Run | undefined {
    return q.selectRun(this.db, id);
  }

  listRuns(project?: string, limit = 50): Run[] {
    return q.selectRuns(this.db, project, limit);
  }

  // Entitas v2: hanya simpan dan baca; tidak ada penghapusan atau pemangkasan.
  saveProject(p: ProjectRow): void { q2.upsertProject(this.db, p); }
  getProject(id: string): ProjectRow | undefined { return q2.selectProject(this.db, id); }
  listProjects(): ProjectRow[] { return q2.selectProjects(this.db); }
  saveSession(s: SessionRow): void { q2.upsertSession(this.db, s); }
  getSession(id: string): SessionRow | undefined { return q2.selectSession(this.db, id); }
  listSessions(runId: string): SessionRow[] { return q2.selectSessions(this.db, runId); }
  saveMilestone(m: MilestoneRow): void { q2.upsertMilestone(this.db, m); }
  getMilestone(id: string): MilestoneRow | undefined { return q2.selectMilestone(this.db, id); }
  listMilestones(projectId: string): MilestoneRow[] { return q2.selectMilestones(this.db, projectId); }
  saveBatch(b: BatchRow): void { q2.upsertBatch(this.db, b); }
  listBatches(runId: string): BatchRow[] { return q2.selectBatches(this.db, runId); }
  saveItem(i: ItemRow): void { q2.upsertItem(this.db, i); }
  listItems(projectId: string): ItemRow[] { return q2.selectItems(this.db, projectId); }

  saveMessage(m: Message): void {
    q.upsertMessage(this.db, m);
    this.emit(m.runId, 'message', m);
  }

  getMessage(id: string): Message | undefined {
    return q.selectMessage(this.db, id);
  }

  listMessages(runId: string): Message[] {
    return q.selectMessages(this.db, runId);
  }

  addTool(runId: string, t: ToolEvent): void {
    this.emit(runId, 'tool', t);
  }

  eventsAfter(runId: string, after: number, limit = 5000): RunEvent[] {
    return q.selectEventsAfter(this.db, runId, after, limit);
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
