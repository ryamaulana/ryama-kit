// Seam: Harness.answer(always) terhadap claude tiruan + rute DELETE /api/projects/:id/rules/:ruleId (app.inject).
// Nilai harapan dari ARCHITECTURE 7.D.4 dan 6.2: aturan per proyek, kategori berisiko -> rule_not_allowed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HarnessError } from '../src/harness/index.js';
import { projectId } from '../src/projects.js';
import { createApp } from '../src/server.js';
import { setupHarness, tmpProject, waitFor } from './helpers.js';

const terminal = (s: string) => ['done', 'failed', 'stopped', 'disconnected'].includes(s);
const thrown = (f: () => unknown) => { try { f(); } catch (e) { return e as HarnessError; } throw new Error('tidak melempar'); };

test('Selalu setujui: aturan disimpan per proyek, run berikutnya tidak ditanya, Batalkan mengembalikan pertanyaan', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const a = tmpProject();
  const pid = projectId(a.dir);

  const r1 = h.harness.startRun({ projectDir: a.dir, prompt: '[izin]' });
  const p1 = await waitFor(() => h.find(r1.id, (m) => m.kind === 'permission'), 8000, 'izin');
  const answered = h.harness.answer(r1.id, p1.id, { kind: 'permission', decision: 'always' });
  assert.equal(answered.answer?.decision, 'always');
  await waitFor(() => terminal(h.run(r1.id).status));
  assert.equal(h.find(r1.id, (m) => m.kind === 'agent')?.text, 'izin:allow');
  const rules = h.store.listRules(pid);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].tool, 'Write');
  assert.equal(rules[0].pattern, a.root); // folder ../luar.txt
  assert.equal(rules[0].createdFrom, p1.id);
  const saved = h.find(r1.id, (m) => m.kind === 'system' && m.text.startsWith('Aturan disimpan untuk proyek ini'));
  assert.ok(saved, 'pesan sistem Aturan disimpan');
  assert.equal((saved as any).ref?.ruleId, rules[0].id);

  const r2 = h.harness.startRun({ projectDir: a.dir, prompt: '[izin]' });
  await waitFor(() => terminal(h.run(r2.id).status));
  assert.equal(h.messages(r2.id).filter((m) => m.kind === 'permission').length, 0);
  assert.equal(h.find(r2.id, (m) => m.kind === 'agent')?.text, 'izin:allow');

  // proyek lain tidak ikut
  const b = tmpProject();
  const r3 = h.harness.startRun({ projectDir: b.dir, prompt: '[izin]' });
  const p3 = await waitFor(() => h.find(r3.id, (m) => m.kind === 'permission'), 8000, 'izin proyek lain');
  h.harness.answer(r3.id, p3.id, { kind: 'permission', decision: 'deny' });
  await waitFor(() => terminal(h.run(r3.id).status));

  // Batalkan lewat API
  const app = createApp({ store: h.store, harness: h.harness, workRoot: a.root, maxRuns: 1 });
  t.after(() => app.close());
  const del = (url: string) => app.inject({ method: 'DELETE', url, headers: { 'content-type': 'application/json' }, payload: '{}' });
  const res = await del(`/api/projects/${pid}/rules/${rules[0].id}`);
  assert.equal(res.statusCode, 204);
  assert.equal(h.store.listRules(pid).length, 0);
  assert.ok(h.store.listRules(pid, true)[0].revokedAt);
  assert.ok(h.find(r1.id, (m) => m.kind === 'system' && m.text.startsWith('Aturan dibatalkan')), 'pesan sistem pembatalan');
  const again = await del(`/api/projects/${pid}/rules/${rules[0].id}`);
  assert.equal(again.statusCode, 404);
  assert.equal(again.json().error.code, 'not_found');
  assert.equal((await del(`/api/projects/000000000000/rules/${rules[0].id}`)).statusCode, 404);
  assert.equal((await del(`/api/projects/${projectId(b.dir)}/rules/${rules[0].id}`)).statusCode, 404); // aturan milik proyek lain
  const bad = await app.inject({ method: 'DELETE', url: `/api/projects/${pid}/rules/${rules[0].id}`, headers: { 'content-type': 'application/json' }, payload: '{"x":1}' });
  assert.equal(bad.statusCode, 400);

  const r4 = h.harness.startRun({ projectDir: a.dir, prompt: '[izin]' });
  const p4 = await waitFor(() => h.find(r4.id, (m) => m.kind === 'permission'), 8000, 'izin setelah dibatalkan');
  h.harness.answer(r4.id, p4.id, { kind: 'permission', decision: 'allow' });
  await waitFor(() => terminal(h.run(r4.id).status));
});

test('Selalu setujui untuk kategori berisiko ditolak rule_not_allowed; permintaan tetap menunggu', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[izin-bahaya]' });
  const p = await waitFor(() => h.find(r.id, (m) => m.kind === 'permission'), 8000, 'izin');
  const e = thrown(() => h.harness.answer(r.id, p.id, { kind: 'permission', decision: 'always' }));
  assert.equal(e.code, 'rule_not_allowed');
  assert.equal(e.status, 400);
  assert.equal(h.store.listRules(projectId(dir)).length, 0);
  assert.equal(h.store.getMessage(p.id)!.state, 'pending');
  h.harness.answer(r.id, p.id, { kind: 'permission', decision: 'deny' });
  await waitFor(() => terminal(h.run(r.id).status));
  assert.equal(h.find(r.id, (m) => m.kind === 'agent')?.text, 'bahaya:deny');
});
