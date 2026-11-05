// Seam: Store (antarmuka publik + berkas SQLite nyata). Menangkap: migrasi v1->v2, batasan unik, tanpa pemangkasan.
// Terlewat: perilaku bus event dan Conductor (item lain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../src/store/index.js';
import type { Run } from '../src/contract/index.js';
import type { MilestoneRow, SessionRow } from '../src/store/index.js';

const run = (id: string, n = 0): Run => ({
  id, project: 'C:\\p', projectName: 'p', prompt: 'x', model: 'sonnet', origin: 'dashboard', status: 'done', reason: null, lastLog: null,
  sessionId: null, pending: 0, tokens: null, startedAt: new Date(1_700_000_000_000 + n * 1000).toISOString(), endedAt: null, durationMs: null,
});
const tok = { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 };
const ms = (id: string, key: string, status: MilestoneRow['status']): MilestoneRow => ({ id, projectId: 'p1', backlogKey: key, name: key, kind: 'fase', status, reviewRound: 0, runId: null, initialItemCount: 3, proposedAt: null, approvedAt: null, runningAt: null, readyReviewAt: null, acceptedAt: null });
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-store-')), 'v1.db');

test('berkas v1 (2 run) tetap terbaca setelah migrasi dengan nilai bawaan', () => {
  const file = tmp();
  const db = new DatabaseSync(file); // skema v1 persis dari migrasi awal
  db.exec(`CREATE TABLE runs (id TEXT PRIMARY KEY, project TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE messages (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, type TEXT NOT NULL, at TEXT NOT NULL, json TEXT NOT NULL);
    PRAGMA user_version = 1;`);
  for (const r of [run('a', 1), run('b', 2)]) db.prepare('INSERT INTO runs VALUES (?,?,?,?,?)').run(r.id, r.project, r.status, r.startedAt, JSON.stringify(r));
  db.close();

  const s = new Store(file);
  assert.deepEqual(s.listRuns().map((r) => r.id), ['b', 'a']);
  assert.equal(s.getRun('a')?.prompt, 'x');
  s.close();
  const raw = new DatabaseSync(file);
  assert.equal((raw.prepare('PRAGMA user_version').get() as any).user_version, 3);
  const row = raw.prepare("SELECT origin, title, project_id, team_id FROM runs WHERE id = 'a'").get() as any;
  assert.deepEqual({ ...row }, { origin: 'dashboard', title: '', project_id: null, team_id: null });
  raw.close();
});

test('migrasi dijalankan ulang aman; data v2 bertahan setelah buka ulang', () => {
  const file = tmp();
  let s = new Store(file);
  s.saveRun(run('r1'), { projectId: 'p1', teamId: 'fullstack', commandId: 'build', title: 'Bangun', origin: 'desktop' });
  s.saveRun({ ...run('r1'), status: 'failed' }); // simpan ulang tanpa meta tidak menghapus kolom meta
  s.close();
  s = new Store(file);
  const raw = new DatabaseSync(file);
  assert.deepEqual({ ...(raw.prepare("SELECT project_id, team_id, command_id, title, origin, status FROM runs WHERE id='r1'").get() as any) },
    { project_id: 'p1', team_id: 'fullstack', command_id: 'build', title: 'Bangun', origin: 'desktop', status: 'failed' });
  raw.close();
  s.close();
});

test('entitas v2 tersimpan dan terbaca utuh; upsert memperbarui', () => {
  const s = new Store(':memory:');
  s.saveProject({ id: 'p1', path: 'C:\\x', name: 'x', teamId: 'fullstack', batchSize: null, lastCommandId: null, lastActivityAt: null });
  const sess: SessionRow = { id: 'sess1', runId: 'r1', batchId: null, kind: 'batch', startedAt: '2026-01-01T00:00:00Z', endedAt: null, end: null, modelUsed: null, tokens: tok };
  s.saveSession(sess);
  s.saveSession({ ...sess, end: 'limit', endedAt: '2026-01-01T01:00:00Z' });
  assert.deepEqual(s.getSession('sess1'), { ...sess, end: 'limit', endedAt: '2026-01-01T01:00:00Z' });
  const b = { id: 'b1', runId: 'r1', milestoneId: 'm1', number: 1, sessionId: 'sess1', itemKeys: ['f01', 'f02'], commitHash: null, commitError: null, startedAt: '2026-01-01T00:00:00Z', endedAt: null, tokens: tok };
  s.saveBatch(b);
  assert.deepEqual(s.listBatches('r1'), [b]);
  const it = { projectId: 'p1', itemKey: 'f01', milestoneId: 'm1', title: 't', agent: 'be', type: 'fitur', status: 'todo', attempts: 0, origin: 'asli' as const, fixOf: null, firstSeenAt: 'x', doneAt: null, doneBatchId: null, tokens: tok };
  s.saveItem(it);
  s.saveItem({ ...it, status: 'done', attempts: 1 });
  assert.deepEqual(s.listItems('p1').map((i) => [i.itemKey, i.status, i.attempts]), [['f01', 'done', 1]]);
  s.close();
});

test('batasan unik: path proyek, (proyek, backlog_key), nomor batch per run, satu milestone aktif per proyek', () => {
  const s = new Store(':memory:');
  const p = { id: 'p1', path: 'C:\\x', name: 'x', teamId: null, batchSize: null, lastCommandId: null, lastActivityAt: null };
  s.saveProject(p);
  assert.throws(() => s.saveProject({ ...p, id: 'p2' }), /UNIQUE/);
  s.saveMilestone(ms('m1', 'fase1', 'running'));
  assert.throws(() => s.saveMilestone(ms('m2', 'fase1', 'proposed')), /UNIQUE/);
  assert.throws(() => s.saveMilestone(ms('m3', 'fase2', 'ready_review')), /UNIQUE/);
  s.saveMilestone(ms('m4', 'fase3', 'accepted')); // status lain boleh banyak
  s.saveMilestone({ ...ms('m1', 'fase1', 'accepted') });
  s.saveMilestone(ms('m3', 'fase2', 'running')); // setelah yang lama selesai, boleh
  assert.equal(s.listMilestones('p1').length, 3);
  const b = { id: 'b1', runId: 'r1', milestoneId: null, number: 1, sessionId: null, itemKeys: [], commitHash: null, commitError: null, startedAt: 'x', endedAt: null, tokens: tok };
  s.saveBatch(b);
  assert.throws(() => s.saveBatch({ ...b, id: 'b2' }), /UNIQUE/);
  s.close();
});

test('tanpa pemangkasan: 300 run tersimpan semua; listRuns hanya membatasi bacaan', () => {
  const s = new Store(':memory:');
  for (let i = 0; i < 300; i++) s.saveRun(run(`r${i}`, i));
  assert.equal(s.listRuns(undefined, 100000).length, 300);
  assert.equal(s.listRuns().length, 50);
  s.close();
});

test('kode store tidak berisi DELETE/prune', () => {
  const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'src', 'store');
  for (const f of fs.readdirSync(dir)) assert.doesNotMatch(fs.readFileSync(path.join(dir, f), 'utf8'), /DELETE\s+FROM|DROP\s+TABLE|prune/i, f);
});

// Seam: Store bagian 2 (antarmuka publik). Menangkap: migrasi v2->v3 tanpa kehilangan pesan, simpan/baca tiap entitas, subscribeAll, payload event utuh, dedupe notifikasi. Terlewat: kinerja, kueri Kesehatan kit.
const msg = (id: string, runId: string, extra: object = {}) => ({ id, runId, kind: 'question', text: 'q', createdAt: '2026-01-01T00:00:00.000Z', state: 'pending', questions: null, tool: null, answer: null, answeredAt: null, sentOnResume: false, ...extra }) as any;

test('v3: pesan lama (v2) tetap terbaca dan kolom baru terisi dari json', () => {
  const file = tmp();
  const s0 = new Store(file);
  s0.saveRun(run('r1'));
  s0.close();
  const db = new DatabaseSync(file);
  db.exec('PRAGMA user_version = 2; DROP TABLE settings; DROP TABLE notifications; DROP TABLE push_subscriptions; DROP TABLE permission_rules; DROP TABLE agent_activity; DROP TABLE evidence;');
  db.exec('ALTER TABLE messages DROP COLUMN kind; ALTER TABLE messages DROP COLUMN state; ALTER TABLE messages DROP COLUMN answered_at; ALTER TABLE messages DROP COLUMN ref_item; ALTER TABLE messages DROP COLUMN ref_milestone;');
  const m = msg('m1', 'r1', { state: 'answered', answeredAt: '2026-01-01T00:01:00.000Z' });
  db.prepare('INSERT INTO messages (id, run_id, created_at, json) VALUES (?,?,?,?)').run(m.id, m.runId, m.createdAt, JSON.stringify(m));
  db.close();
  const s = new Store(file);
  assert.deepEqual(s.getMessage('m1'), m);
  const raw = new DatabaseSync(file).prepare('SELECT kind, state, answered_at FROM messages WHERE id = ?').get('m1');
  assert.deepEqual({ ...raw }, { kind: 'question', state: 'answered', answered_at: '2026-01-01T00:01:00.000Z' });
});

test('pesan: kolom terindeks mengikuti ref dan state; json utuh', () => {
  const s = new Store(':memory:');
  const m = msg('m2', 'r1', { kind: 'milestone', ref: { itemId: 'f01', milestoneId: 'ms1' }, source: 'backlog', proposal: null });
  s.saveMessage(m);
  s.saveMessage({ ...m, state: 'answered', answeredAt: '2026-01-01T00:05:00.000Z' });
  assert.equal(s.getMessage('m2')!.state, 'answered');
  assert.deepEqual(s.listMessages('r1').map((x) => x.id), ['m2']);
});

test('bukti, aktivitas agent, aturan izin, push, notifikasi, pengaturan: simpan, baca, perbarui', () => {
  const s = new Store(':memory:');
  const ev = { id: 'e1', projectId: 'p1', itemKey: 'f01', kind: 'image', path: 'docs/a.png', caption: 'a', size: 10, present: true, checkedAt: 't' };
  s.saveEvidence(ev); s.saveEvidence({ ...ev, present: false });
  s.saveEvidence({ ...ev, id: 'e2', itemKey: 'f02' });
  assert.deepEqual(s.listEvidence('p1', 'f01'), [{ ...ev, present: false }]);
  assert.equal(s.listEvidence('p1').length, 2);

  const act = { id: 'tu1', runId: 'r1', sessionId: 's1', agent: 'be', inTeam: true, itemKey: 'f06', round: 1, status: 'running' as const, startedAt: 't1', endedAt: null, modelUsed: null, toolCount: 0, files: ['a.ts'], tokens: tok };
  s.saveActivity(act); s.saveActivity({ ...act, status: 'done', endedAt: 't2', toolCount: 7, modelUsed: 'sonnet' });
  assert.deepEqual(s.listActivities('r1'), [{ ...act, status: 'done', endedAt: 't2', toolCount: 7, modelUsed: 'sonnet' }]);

  const rule = { id: 'ru1', projectId: 'p1', tool: 'Bash', pattern: 'npm test*', createdFrom: 'm1', createdAt: 't', revokedAt: null };
  s.saveRule(rule); s.saveRule({ ...rule, revokedAt: 't9' });
  assert.deepEqual(s.listRules('p1'), []);
  assert.equal(s.listRules('p1', true)[0].revokedAt, 't9');

  const sub = { endpoint: 'https://push.example/x', keys: { p256dh: 'a', auth: 'b' }, label: 'HP', createdAt: 't', lastOkAt: null, failures: 0 };
  s.savePushSub(sub); s.savePushSub({ ...sub, failures: 2 });
  assert.deepEqual(s.listPushSubs(), [{ ...sub, failures: 2 }]);
  assert.throws(() => s.savePushSub({ ...sub, endpoint: 'http://x/y' }), /https/);

  const n = { key: 'msg:m1', runId: 'r1', kind: 'question', sentAt: 't', resolvedAt: null };
  assert.equal(s.saveNotification(n), true);
  assert.equal(s.saveNotification({ ...n, resolvedAt: 't3' }), false);
  assert.equal(s.getNotification('msg:m1')!.resolvedAt, 't3');

  assert.equal(s.getSetting('batch_size'), undefined);
  s.setSetting('batch_size', '3'); s.setSetting('batch_size', '4');
  assert.equal(s.getSetting('batch_size'), '4');
});

test('subscribeAll memancarkan event semua run (baru saja) dan bisa berhenti; payload alat utuh', () => {
  const s = new Store(':memory:');
  s.saveRun(run('before'));
  const got: any[] = [];
  const off = s.subscribeAll((e) => got.push(e));
  const big = 'x'.repeat(200_000);
  s.saveRun(run('a')); s.saveRun(run('b'));
  s.saveMessage(msg('m1', 'a'));
  s.addTool('b', { name: 'Bash', summary: 's', subagent: false, at: 't', id: 'tu9', input: { command: 'ls', big }, result: { out: big }, status: 'done' });
  assert.deepEqual(got.map((e) => `${e.runId}:${e.type}`), ['a:run', 'a:status', 'b:run', 'b:status', 'a:message', 'b:tool']);
  assert.equal((s.eventsAfter('b', 0).at(-1)!.data as any).input.big.length, 200_000);
  assert.equal((s.eventsAfter('b', 0).at(-1)!.data as any).result.out.length, 200_000);
  off(); s.saveRun(run('c'));
  assert.equal(got.length, 6);
});
