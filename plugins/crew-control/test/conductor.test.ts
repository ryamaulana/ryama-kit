// Seam: Conductor (start/chat/transition/activeRunId) dan fungsi murni conductor/status, terhadap Harness + `claude` tiruan.
// Bukti lewat Store (run, event status), bukan internal Conductor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conductor, ConductorError } from '../src/conductor/index.js';
import { canTransition, liveStatus } from '../src/conductor/status.js';
import type { Run } from '../src/contract/index.js';
import { setupHarness, tmpProject, waitFor } from './helpers.js';

const thrown = (f: () => unknown) => { try { f(); } catch (e) { return e as ConductorError; } throw new Error('tidak melempar'); };
const terminal = (s: string) => ['done', 'failed', 'stopped', 'disconnected'].includes(s);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function setup(maxRuns = 1) {
  const h = await setupHarness({ maxRuns: 3 }); // batas yang diuji milik Conductor
  return { ...h, c: new Conductor({ store: h.store, harness: h.harness, maxRuns }) };
}
const statusEvents = (h: { store: { eventsAfter: (id: string, a: number) => { type: string; data: any }[] } }, id: string) =>
  h.store.eventsAfter(id, 0).filter((e) => e.type === 'status').map((e) => e.data);
const heldRun = (dir: string, id: string, status: Run['status'], sessionId: string | null = null): Run => ({
  id, project: dir, projectName: 'x', prompt: 'p', model: null, origin: 'dashboard', status, reason: null, lastLog: null,
  sessionId, pending: 0, tokens: null, startedAt: new Date().toISOString(), endedAt: null, durationMs: null,
});

test('prioritas tampilan saat ada sesi: paused > needs_owner > running', () => {
  assert.equal(liveStatus({ paused: true, pending: 2 }), 'paused');
  assert.equal(liveStatus({ paused: true, pending: 0 }), 'paused');
  assert.equal(liveStatus({ paused: false, pending: 1 }), 'needs_owner');
  assert.equal(liveStatus({ paused: false, pending: 0 }), 'running');
});

test('mesin status: transisi sah dan tidak sah', () => {
  const ok: [Run['status'] | null, Run['status']][] = [
    [null, 'running'], [null, 'needs_owner'], ['running', 'paused'], ['paused', 'needs_owner'], ['needs_owner', 'running'],
    ['running', 'limit_paused'], ['limit_paused', 'running'], ['running', 'ready_review'], ['ready_review', 'running'],
    ['running', 'done'], ['paused', 'stopped'], ['needs_owner', 'failed'], ['running', 'disconnected'],
    ['done', 'running'], ['failed', 'running'], ['disconnected', 'running'], ['ready_review', 'done'],
  ];
  const bad: [Run['status'] | null, Run['status']][] = [
    ['stopped', 'running'], ['done', 'paused'], ['failed', 'done'], [null, 'done'], ['limit_paused', 'paused'],
    ['ready_review', 'paused'], ['done', 'done'],
  ];
  for (const [f, t] of ok) assert.equal(canTransition(f, t), true, `${f} -> ${t}`);
  for (const [f, t] of bad) assert.equal(canTransition(f, t), false, `${f} -> ${t}`);
});

test('setiap perubahan status tercatat sebagai event status (dari, ke, alasan, waktu); semuanya transisi sah', async (t) => {
  const h = await setup(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.c.start({ projectDir: dir, prompt: '[tanya]' });
  const q = await waitFor(() => h.find(r.id, (m) => m.kind === 'question' && m.state === 'pending'), 8000, 'pertanyaan');
  h.harness.answer(r.id, q.id, { kind: 'question', answers: { 'Warna favorit?': 'Biru' } });
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'selesai');
  const ev = statusEvents(h, r.id);
  assert.deepEqual(ev.map((e) => [e.from, e.to]), [[null, 'running'], ['running', 'needs_owner'], ['needs_owner', 'running'], ['running', 'done']]);
  for (const e of ev) {
    assert.ok(canTransition(e.from, e.to));
    assert.ok(!Number.isNaN(Date.parse(e.at)));
    assert.ok('reason' in e);
  }
  // Stop: alasan ikut tercatat
  const s = h.c.start({ projectDir: dir, prompt: '[stop]' });
  await waitFor(() => h.store.eventsAfter(s.id, 0).some((e) => e.type === 'tool'), 8000);
  h.harness.stop(s.id);
  await waitFor(() => terminal(h.run(s.id).status), 10000);
  assert.deepEqual(statusEvents(h, s.id).at(-1), { ...statusEvents(h, s.id).at(-1), from: 'running', to: 'stopped', reason: 'Dihentikan oleh pemilik.' });
});

test('satu run aktif per proyek (proses hidup atau run tertahan di data); kapasitas bawaan 1', async (t) => {
  const h = await setup(1); t.after(h.close);
  const a = tmpProject('a');
  const r = h.c.start({ projectDir: a.dir, prompt: '[stop]' });
  const busy = thrown(() => h.c.start({ projectDir: a.dir, prompt: '[ok]' }));
  assert.equal(busy.code, 'project_busy');
  assert.equal(busy.status, 409);
  assert.equal(busy.details?.activeRunId, r.id);
  assert.equal(h.c.activeRunId(a.dir), r.id);
  const b = tmpProject('b');
  const cap = thrown(() => h.c.start({ projectDir: b.dir, prompt: '[ok]' }));
  assert.equal(cap.code, 'capacity');
  assert.equal(cap.status, 409);
  h.harness.stop(r.id);
  await waitFor(() => terminal(h.run(r.id).status), 10000);
  assert.equal(h.c.activeRunId(a.dir), null);

  // run tanpa proses yang masih menunggu pemilik (mis. usulan milestone) tetap memegang proyek
  h.store.saveRun(heldRun(b.dir, 'held', 'needs_owner'));
  assert.equal(thrown(() => h.c.start({ projectDir: b.dir, prompt: '[ok]' })).details?.activeRunId, 'held');
  assert.equal(h.c.activeRunId(b.dir), 'held');
  // ...tetapi tidak memakai kapasitas: proyek lain tetap bisa mulai
  const ok = h.c.start({ projectDir: a.dir, prompt: '[ok]' });
  await waitFor(() => terminal(h.run(ok.id).status));
});

test('CREW_MAX_RUNS 2: run kedua di proyek lain boleh, ketiga ditolak capacity; limit_paused ikut dihitung', async (t) => {
  const h = await setup(2); t.after(h.close);
  const [a, b, c] = ['a', 'b', 'c'].map((n) => tmpProject(n));
  const r1 = h.c.start({ projectDir: a.dir, prompt: '[stop]' });
  h.store.saveRun(heldRun(b.dir, 'lim', 'limit_paused', 's-lim')); // akan jalan sendiri setelah reset
  assert.equal(thrown(() => h.c.start({ projectDir: c.dir, prompt: '[ok]' })).code, 'capacity');
  h.store.saveRun({ ...heldRun(b.dir, 'lim', 'stopped', 's-lim'), endedAt: new Date().toISOString() });
  const r2 = h.c.start({ projectDir: c.dir, prompt: '[stop]' });
  for (const id of [r1.id, r2.id]) h.harness.stop(id);
  await waitFor(() => terminal(h.run(r1.id).status) && terminal(h.run(r2.id).status), 10000);
});

test('run origin desktop tidak dihitung kapasitas dan tidak memegang proyek', async (t) => {
  const h = await setup(1); t.after(h.close);
  const a = tmpProject('a');
  h.store.saveRun(heldRun(a.dir, 'desk', 'running', 'desk-sess'), { origin: 'desktop' });
  const r = h.c.start({ projectDir: a.dir, prompt: '[ok]' });
  await waitFor(() => terminal(h.run(r.id).status));
  assert.equal(h.run(r.id).status, 'done');
});

test('batas kapasitas di luar 1..3 ditolak saat Conductor dibuat', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  for (const n of [0, 4, 1.5]) assert.throws(() => new Conductor({ store: h.store, harness: h.harness, maxRuns: n }));
});

test('chat melanjutkan run done lewat admission yang sama (proyek sibuk / kapasitas penuh ditolak, pesan tidak tersimpan)', async (t) => {
  const h = await setup(1); t.after(h.close);
  const a = tmpProject('a');
  const b = tmpProject('b');
  const r = h.c.start({ projectDir: a.dir, prompt: '[ok]' });
  await waitFor(() => terminal(h.run(r.id).status));
  const other = h.c.start({ projectDir: b.dir, prompt: '[stop]' });
  assert.equal(thrown(() => h.c.chat(r.id, 'halo')).code, 'capacity');
  assert.equal(h.messages(r.id).some((m) => m.kind === 'owner'), false);
  h.harness.stop(other.id);
  await waitFor(() => terminal(h.run(other.id).status), 10000);
  const m = h.c.chat(r.id, 'halo');
  assert.equal(m.kind, 'owner');
  assert.equal(h.run(r.id).status, 'running');
  await waitFor(() => terminal(h.run(r.id).status));
  assert.deepEqual(statusEvents(h, r.id).map((e) => e.to), ['running', 'done', 'running', 'done']);
});

test('transition: hanya perubahan yang sah diterima dan tercatat', async (t) => {
  const h = await setup(1); t.after(h.close);
  const { dir } = tmpProject();
  h.store.saveRun(heldRun(dir, 'rv', 'ready_review', 's-rv'));
  const e = thrown(() => h.c.transition('rv', 'paused', null));
  assert.equal(e.code, 'invalid_transition');
  const done = h.c.transition('rv', 'done', 'Milestone diterima.');
  assert.equal(done.status, 'done');
  assert.ok(done.endedAt);
  assert.deepEqual(statusEvents(h, 'rv').at(-1), { ...statusEvents(h, 'rv').at(-1), from: 'ready_review', to: 'done', reason: 'Milestone diterima.' });
  assert.equal(thrown(() => h.c.transition('nope', 'done', null)).code, 'not_found');
});

test('Harness memberi --session-id sendiri: id diketahui sejak mulai, isOwnSession benar selama proses hidup', async (t) => {
  const h = await setup(1); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.c.start({ projectDir: dir, prompt: '[stop]' });
  assert.match(r.sessionId ?? '', UUID); // sebelum `init` tiba
  assert.equal(h.harness.isOwnSession(r.sessionId!), true);
  assert.equal(h.harness.isOwnSession('sesi-desktop-lain'), false);
  await waitFor(() => h.store.eventsAfter(r.id, 0).some((e) => e.type === 'tool'), 8000);
  assert.equal(h.run(r.id).sessionId, r.sessionId); // claude memakai id yang diberikan
  h.harness.stop(r.id);
  await waitFor(() => terminal(h.run(r.id).status), 10000);
  assert.equal(h.harness.isOwnSession(r.sessionId!), false);
  const r2 = h.c.start({ projectDir: dir, prompt: '[ok]' });
  assert.notEqual(r2.sessionId, r.sessionId); // uuid baru per launch
  await waitFor(() => terminal(h.run(r2.id).status));
});
