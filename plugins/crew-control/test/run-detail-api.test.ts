// Seam: HTTP GET /api/runs/:id, GET /api/runs/:id/agents/:agent, dan SSE (activity/batch/milestone) lewat server sungguhan.
// Menangkap: bentuk kontrak, isLatest, penggabungan langkah, batas 200, agent belum jalan, event < 1 dtk. Tidak menangkap: pengisi data oleh harness (diuji activity.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Harness } from '../src/harness/index.js';
import { createApp } from '../src/server.js';
import { Store } from '../src/store/index.js';
import { projectId } from '../src/projects.js';
import { AgentDetail, RunDetail, RunEvent, type Run } from '../src/contract/index.js';
import { FAKE, tmpProject, waitFor } from './helpers.js';

const Z = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const mkRun = (id: string, project: string, startedAt: string): Run => ({
  id, project, projectName: 'app', prompt: 'p', model: 'sonnet', origin: 'dashboard', status: 'done', reason: null, lastLog: null,
  sessionId: null, pending: 0, tokens: null, startedAt, endedAt: null, durationMs: null,
});
const act = (id: string, round: number, o: object = {}) => ({
  id, runId: 'r2', sessionId: 's1', agent: 'tiruan-agent', inTeam: true, itemKey: 'lp01', round, status: 'done' as const,
  startedAt: `2026-01-01T00:0${round}:00.000Z`, endedAt: `2026-01-01T00:0${round}:30.000Z`, modelUsed: 'haiku', toolCount: 2,
  files: [`src/f${round}.ts`, 'src/shared.ts'], tokens: { input: 10 * round, output: 5, cacheRead: 1, cacheWrite: 2 }, ...o,
});

async function setup() {
  const { root, dir } = tmpProject('app');
  const store = new Store(':memory:');
  const harness = new Harness({ store, hookBaseUrl: 'http://127.0.0.1:1', bin: process.execPath, binArgs: [FAKE], maxRuns: 1 });
  const teamDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-teams-'));
  fs.cpSync(path.join(import.meta.dirname, 'fixtures/teams/tiruan'), path.join(teamDir, 'tiruan'), { recursive: true });
  const app = createApp({ store, harness, workRoot: root, maxRuns: 1, teamDirs: [teamDir] });
  const srv = http.createServer(); // port bebas lalu dipakai app
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const port = (srv.address() as { port: number }).port;
  await new Promise((r) => srv.close(r));
  await app.listen({ port, host: '127.0.0.1' });
  const get = async (url: string) => { const r = await fetch(`http://127.0.0.1:${port}${url}`); return { status: r.status, body: (await r.json()) as any }; };
  return { dir, store, get, port, close: async () => { harness.shutdown(); await app.close(); } };
}

test('RunDetail: batches, milestone, activities, isLatest', async (t) => {
  const s = await setup(); t.after(s.close);
  const pid = projectId(s.dir);
  s.store.saveRun(mkRun('r1', s.dir, '2026-01-01T00:00:00.000Z'));
  s.store.saveRun(mkRun('r2', s.dir, '2026-01-02T00:00:00.000Z'));
  s.store.saveMilestone({ id: 'm1', projectId: pid, backlogKey: 'k', name: 'Layar proyek', kind: 'Akhir', status: 'running', reviewRound: 0, runId: 'r2', initialItemCount: 3, proposedAt: null, approvedAt: null, runningAt: null, readyReviewAt: null, acceptedAt: null });
  s.store.saveBatch({ id: 'b1', runId: 'r2', milestoneId: 'm1', number: 1, sessionId: 's1', itemKeys: ['lp01'], commitHash: null, commitError: null, startedAt: '2026-01-02T00:00:00.000Z', endedAt: null, tokens: Z });
  s.store.saveActivity(act('t1', 1));

  const r2 = await s.get('/api/runs/r2');
  assert.equal(r2.status, 200);
  const d = RunDetail.parse(r2.body);
  assert.equal(d.isLatest, true);
  assert.equal(d.milestone?.name, 'Layar proyek');
  assert.deepEqual(d.batches.map((b) => b.number), [1]);
  assert.deepEqual(d.activities.map((a) => a.id), ['t1']);
  assert.equal((await s.get('/api/runs/r1')).body.isLatest, false);
  assert.equal((await s.get('/api/runs/r1')).body.milestone, null);
  assert.equal((await s.get('/api/runs/tidak-ada')).status, 404);
});

test('AgentDetail: model deklarasi vs terpakai, putaran, jumlah, langkah digabung dan <= 200, bukti', async (t) => {
  const s = await setup(); t.after(s.close);
  const pid = projectId(s.dir);
  s.store.saveRun(mkRun('r2', s.dir, '2026-01-02T00:00:00.000Z'), { projectId: pid, teamId: 'tiruan' });
  s.store.saveActivity(act('t1', 1));
  s.store.saveActivity(act('t2', 2, { modelUsed: 'opus' }));
  s.store.saveEvidence({ id: 'e1', projectId: pid, itemKey: 'lp01', kind: 'image', path: 'docs/bukti/a.png', caption: 'Layar', size: 10, present: true, checkedAt: '2026-01-01T00:00:00.000Z' });
  s.store.saveEvidence({ id: 'e2', projectId: pid, itemKey: 'lain', kind: 'image', path: 'docs/bukti/b.png', caption: 'Lain', size: 10, present: true, checkedAt: '2026-01-01T00:00:00.000Z' });
  // 250 langkah, tiap langkah dua event (mulai + hasil); agent lain diabaikan
  for (let i = 0; i < 250; i++) {
    const base = { name: 'Read', summary: `langkah ${i}`, subagent: true, agent: 'tiruan-agent', toolUseId: `u${i}` };
    s.store.addTool('r2', { ...base, at: '2026-01-01T00:00:01.000Z', status: 'running', input: { file: `f${i}` } });
    s.store.addTool('r2', { ...base, at: '2026-01-01T00:00:02.000Z', status: 'done', result: `hasil ${i}` });
  }
  s.store.addTool('r2', { name: 'Read', summary: 'x', subagent: true, at: 'z', agent: 'be', toolUseId: 'zz' });

  const r = await s.get('/api/runs/r2/agents/tiruan-agent');
  assert.equal(r.status, 200);
  const d = AgentDetail.parse(r.body);
  assert.equal(d.inTeam, true);
  assert.equal(d.definition?.id, 'tiruan-agent');
  assert.equal(d.modelDeclared, d.definition?.model ?? null);
  assert.equal(d.modelUsed, 'opus'); // putaran terakhir
  assert.deepEqual(d.rounds.map((x) => x.round), [1, 2]);
  assert.deepEqual(d.files, ['src/f1.ts', 'src/shared.ts', 'src/f2.ts']);
  assert.deepEqual(d.tokens, { input: 30, output: 10, cacheRead: 2, cacheWrite: 4 });
  assert.equal(d.durationMs, 60000);
  assert.deepEqual(d.evidence.map((e) => e.id), ['e1']);
  assert.equal(d.steps.length, 200);
  assert.equal(d.steps.at(-1)!.summary, 'langkah 249');
  assert.equal(d.steps[0]!.summary, 'langkah 50');
  assert.equal(d.steps.at(-1)!.status, 'done');
  assert.deepEqual(d.steps.at(-1)!.input, { file: 'f249' }); // input dari event mulai tetap ada
});

test('AgentDetail: agent belum jalan memuat definisinya; agent tak dikenal 404', async (t) => {
  const s = await setup(); t.after(s.close);
  s.store.saveRun(mkRun('r2', s.dir, '2026-01-02T00:00:00.000Z'), { teamId: 'tiruan' });
  const d = AgentDetail.parse((await s.get('/api/runs/r2/agents/tiruan-agent')).body);
  assert.equal(d.definition?.id, 'tiruan-agent');
  assert.deepEqual([d.rounds, d.steps, d.files, d.evidence], [[], [], [], []]);
  assert.equal(d.modelUsed, null);
  assert.equal(d.durationMs, 0);
  assert.equal((await s.get('/api/runs/r2/agents/hantu')).status, 404);
  assert.equal((await s.get('/api/runs/r2/agents/..%2Fx')).status, 404);
  assert.equal((await s.get('/api/runs/nope/agents/tiruan-agent')).status, 404);
});

test('SSE: activity, batch, milestone tiba < 1 dtk setelah ditulis', async (t) => {
  const s = await setup();
  const ac = new AbortController();
  t.after(async () => { ac.abort(); await s.close(); }); // koneksi SSE ditutup dulu, kalau tidak app.close menunggu
  s.store.saveRun(mkRun('r2', s.dir, '2026-01-02T00:00:00.000Z'));
  const seen = new Map<string, number>();
  const res = await fetch(`http://127.0.0.1:${s.port}/api/runs/r2/events`, { signal: ac.signal });
  (async () => {
    let buf = '';
    for await (const c of res.body as any) {
      buf += new TextDecoder().decode(c, { stream: true });
      let i: number;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const b = buf.slice(0, i); buf = buf.slice(i + 2);
        const type = /^event: (\w+)$/m.exec(b)?.[1], data = /^data: (.*)$/m.exec(b)?.[1];
        if (type && data) { RunEvent.parse({ seq: 1, runId: 'r2', at: '', type, data: JSON.parse(data) }); seen.set(type, Date.now()); }
      }
    }
  })().catch(() => {});
  await waitFor(() => seen.has('run'), 2000, 'replay awal');
  const t0 = Date.now();
  s.store.saveActivity(act('t1', 1));
  s.store.saveBatch({ id: 'b1', runId: 'r2', milestoneId: null, number: 1, sessionId: null, itemKeys: [], commitHash: null, commitError: null, startedAt: '2026-01-02T00:00:00.000Z', endedAt: null, tokens: Z });
  s.store.saveMilestone({ id: 'm1', projectId: 'p', backlogKey: 'k', name: 'M', kind: 'Akhir', status: 'running', reviewRound: 0, runId: 'r2', initialItemCount: 1, proposedAt: null, approvedAt: null, runningAt: null, readyReviewAt: null, acceptedAt: null });
  await waitFor(() => ['activity', 'batch', 'milestone'].every((k) => seen.has(k)), 1000, 'tiga event');
  for (const k of ['activity', 'batch', 'milestone']) assert.ok(seen.get(k)! - t0 < 1000, k);
});
