// Penyimpanan di balik satu modul (node:sqlite). Bagian lain hanya memakai kelas ini.
// Setiap tulisan run/pesan sekaligus menjadi event berurutan (seq) untuk SSE dan pemutaran ulang.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { TERMINAL_STATUSES, type Message, type MessageV2, type Run, type RunEvent, type ToolEvent } from '../contract/index.js';
import { migrate } from './migrations.js';
import * as q from './queries.js';
import * as q2 from './queries2.js';
import * as q3 from './queries3.js';
import type { ActivityRow, BatchRow, EvidenceRow, ItemRow, NotificationRow, PushSubRow, RuleRow, MilestoneRow, ProjectRow, RunMeta, SessionRow } from './types.js';
export type * from './types.js';

const ALL = Symbol('all');

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
    this.bus.emit(ALL, ev);
    return ev;
  }

  /** Perubahan status sekaligus dicatat sebagai event `status` (dari, ke, alasan, waktu), siapa pun penulisnya. */
  saveRun(run: Run, meta: RunMeta = {}): void {
    const from = q.selectRun(this.db, run.id)?.status ?? null;
    q.upsertRun(this.db, run);
    q2.upsertRunMeta(this.db, run, meta);
    this.emit(run.id, 'run', run);
    if (from !== run.status) this.emit(run.id, 'status', { from, to: run.status, reason: run.reason, at: new Date().toISOString() });
  }

  /** Run belum berakhir (semua asal), untuk cek satu run aktif per proyek dan kapasitas. */
  listActiveRuns(): { run: Run; origin: string }[] { return q.selectActiveRuns(this.db); }

  /** team_id run (kolom v2), untuk mencocokkan agent dengan tim saat sesi dilanjutkan. */
  runTeamId(runId: string): string | null {
    return (this.db.prepare('SELECT team_id FROM runs WHERE id = ?').get(runId) as { team_id: string | null } | undefined)?.team_id ?? null;
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

  saveMessage(m: Message | MessageV2): void {
    q.upsertMessage(this.db, m);
    this.emit(m.runId, 'message', m as Message);
  }

  getMessage(id: string): Message | undefined {
    return q.selectMessage(this.db, id);
  }

  listMessages(runId: string): Message[] {
    return q.selectMessages(this.db, runId);
  }

  saveEvidence(e: EvidenceRow): void { q3.upsertEvidence(this.db, e); }
  listEvidence(projectId: string, itemKey?: string): EvidenceRow[] { return q3.selectEvidence(this.db, projectId, itemKey); }
  saveActivity(a: ActivityRow): void { q3.upsertActivity(this.db, a); this.emit(a.runId, 'activity', a); }
  listActivities(runId: string): ActivityRow[] { return q3.selectActivities(this.db, runId); }
  saveRule(r: RuleRow): void { q3.upsertRule(this.db, r); }
  listRules(projectId: string, includeRevoked = false): RuleRow[] { return q3.selectRules(this.db, projectId, includeRevoked); }
  savePushSub(s: PushSubRow): void { q3.upsertPushSub(this.db, s); }
  listPushSubs(): PushSubRow[] { return q3.selectPushSubs(this.db); }
  /** true bila kunci baru (belum pernah dikirim); false bila duplikat, jadi pemicu sama tidak dikirim dua kali (F6). */
  saveNotification(n: NotificationRow): boolean { return q3.upsertNotification(this.db, n); }
  getNotification(key: string): NotificationRow | undefined { return q3.selectNotification(this.db, key); }
  setSetting(key: string, value: string): void { q3.upsertSetting(this.db, key, value); }
  getSetting(key: string): string | undefined { return q3.selectSetting(this.db, key); }

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

  /** Semua event semua run, hanya yang baru (tanpa replay); untuk Notifier. */
  subscribeAll(fn: (e: RunEvent) => void): () => void {
    this.bus.on(ALL, fn);
    return () => this.bus.off(ALL, fn);
  }

  /** Dipanggil saat server mulai: run yang masih "hidup" di data berarti prosesnya sudah tidak ada (Terputus). */
  markDisconnected(): number {
    let n = 0;
    for (const run of this.listRuns(undefined, 100000)) {
      if (TERMINAL_STATUSES.includes(run.status)) continue;
      // tanpa sesi berarti tak pernah punya proses; tidak ada yang terputus
      if (['limit_paused', 'ready_review', 'needs_owner'].includes(run.status) && !run.sessionId) continue;
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
