// Seam: HTTP /api/projects, /api/projects/:id, PUT settings. Angka papan sesuai UX 6.1; nilai harapan ditulis tangan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Harness } from '../src/harness/index.js';
import { createApp } from '../src/server.js';
import { Store } from '../src/store/index.js';
import { projectId } from '../src/projects.js';
import type { Run } from '../src/contract/index.js';
import { FAKE, tmpProject } from './helpers.js';

const tok = { input: 10, output: 5, cacheRead: 1, cacheWrite: 2 };
const mkRun = (id: string, project: string, status: Run['status'], extra: Partial<Run> & Record<string, unknown> = {}): Run => ({
  id, project, projectName: path.basename(project), prompt: 'x', model: 'sonnet', origin: 'dashboard', status, reason: null, lastLog: null,
  sessionId: null, pending: 0, tokens: tok, startedAt: '2026-01-01T00:00:00.000Z', endedAt: null, durationMs: null, ...extra,
}) as Run;

async function setup() {
  const { root } = tmpProject('x');
  const mk = (n: string) => { const d = path.join(root, n); fs.mkdirSync(d); return d; };
  const store = new Store(':memory:');
  const harness = new Harness({ store, hookBaseUrl: 'http://127.0.0.1:1', bin: process.execPath, binArgs: [FAKE], maxRuns: 2 });
  const app = createApp({ store, harness, workRoot: root, maxRuns: 2 });
  const api = async (method: string, url: string, body?: unknown) => {
    const r = await app.inject({ method: method as 'GET', url, headers: { 'content-type': 'application/json' }, payload: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.statusCode, body: r.json() as any };
  };
  return { root, mk, store, api, close: () => { harness.shutdown(); return app.close(); } };
}

test('papan: angka total dan urutan sesuai UX 6.1', async () => {
  const s = await setup();
  const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map(s.mk);
  s.store.saveRun(mkRun('r1', a, 'needs_owner', { pending: 2, startedAt: '2026-01-01T01:00:00.000Z' }));
  s.store.saveRun(mkRun('r2', b, 'failed', { reason: 'boom', startedAt: '2026-01-01T02:00:00.000Z' }));
  s.store.saveRun(mkRun('r3', c, 'limit_paused', { limitResetAt: '2026-01-01T09:00:00.000Z', startedAt: '2026-01-01T03:00:00.000Z' }));
  s.store.saveRun(mkRun('r4', d, 'running', { startedAt: '2026-01-01T04:00:00.000Z' }));
  s.store.saveRun(mkRun('r5', e, 'done', { startedAt: '2026-01-01T05:00:00.000Z', endedAt: '2026-01-01T05:10:00.000Z', durationMs: 600000 }));
  s.store.saveMilestone({ id: 'm1', projectId: projectId(e), backlogKey: 'k', name: 'UI', kind: 'ui', status: 'ready_review', reviewRound: 0, runId: 'r5', initialItemCount: 3, proposedAt: null, approvedAt: null, runningAt: null, readyReviewAt: null, acceptedAt: null });
  s.store.saveItem({ projectId: projectId(e), itemKey: 'i1', milestoneId: 'm1', title: 't', agent: null, type: null, status: 'done', attempts: 1, origin: 'asli', fixOf: null, firstSeenAt: 'x', doneAt: null, doneBatchId: null, tokens: tok });

  const r = await s.api('GET', '/api/projects');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.totals, { needsOwner: 2, readyReview: 1, active: 2, maxRuns: 2, failed: 1, limitPaused: 1, earliestReset: '2026-01-01T09:00:00.000Z' });
  assert.deepEqual(r.body.projects.map((p: any) => p.name), ['a', 'e', 'b', 'd', 'c']);
  const pe = r.body.projects[1];
  assert.deepEqual(pe.milestone, { name: 'UI', done: 1, total: 1, batch: null });
  assert.equal(pe.relPath, 'e');
  assert.equal(r.body.projects[2].reason, 'boom');
  assert.equal((await s.api('GET', '/api/projects?recent=2')).body.projects.length, 2);
  assert.equal((await s.api('GET', '/api/projects?recent=0')).status, 400);
  await s.close();
});

test('detail dan pengaturan proyek; pengaturan global memakai batas 1..20', async () => {
  const s = await setup();
  const a = s.mk('a');
  s.store.saveRun(mkRun('r1', a, 'done'));
  const id = projectId(a);
  assert.equal((await s.api('GET', '/api/projects/nope')).status, 404);
  assert.equal((await s.api('GET', `/api/projects/${id}`)).body.batchSize, 5);
  assert.deepEqual((await s.api('PUT', '/api/settings', { batchSize: 8 })).body, { batchSize: 8 });
  assert.equal((await s.api('GET', `/api/projects/${id}`)).body.batchSize, 8);
  for (const bad of [0, 21, 1.5, '3']) assert.equal((await s.api('PUT', '/api/settings', { batchSize: bad })).status, 400);
  assert.equal((await s.api('PUT', `/api/projects/${id}/settings`, { batchSize: 3 })).body.batchSize, 3);
  assert.equal((await s.api('PUT', `/api/projects/${id}/settings`, { batchSize: 21 })).status, 400);
  const bad = await s.api('PUT', `/api/projects/${id}/settings`, { teamId: 'tidak-ada' });
  assert.equal(bad.status, 400); assert.equal(bad.body.error.code, 'team_not_found');
  assert.equal((await s.api('PUT', '/api/projects/nope/settings', { batchSize: 3 })).status, 404);
  assert.equal((await s.api('GET', `/api/projects/${id}`)).body.batchSize, 3);
  await s.close();
});
