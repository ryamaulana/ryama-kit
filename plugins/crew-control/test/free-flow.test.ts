// Seam: FreeFlow.start (template perintah tim -> sesi) dan aturan "giliran selesai + 2 dtk sepi = run done", lewat claude tiruan.
// Bukti lewat Store (run, pesan). Waktu tunggu FreeFlow diperpendek (graceMs).
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FreeFlow, renderTemplate } from '../src/conductor/free-flow.js';
import { createCatalog } from '../src/teams/catalog.js';
import type { TeamCommand } from '../src/contract/index.js';
import { setupHarness, tmpProject, waitFor } from './helpers.js';

const cmd = (o: Partial<TeamCommand>): TeamCommand =>
  ({ id: 'c', label: 'C', kind: 'session', template: '{prompt}', needsText: true, placeholder: 'Apa?', ...o });
const thrown = (f: () => unknown) => { try { f(); } catch (e) { return e as { code: string; status: number }; } throw new Error('tidak melempar'); };

async function setup(graceMs = 150) {
  const h = await setupHarness();
  return { ...h, ff: new FreeFlow({ harness: h.harness, graceMs }) }; // menggantikan pengamat bawaan helper
}

test('renderTemplate: placeholder diisi sekali, teks pemilik tidak diperluas, placeholder lain kosong', () => {
  assert.equal(renderTemplate('/x {prompt} {note}', { prompt: 'a {home} b' }), '/x a {home} b');
});

test('start: template perintah dirender (bukan prompt mentah) lalu sesi diluncurkan', async (t) => {
  const h = await setup(); t.after(h.close);
  const { dir } = tmpProject();
  const run = h.ff.start({ projectDir: dir, command: cmd({ template: '[html] {prompt}' }), prompt: 'x' });
  assert.equal(run.status, 'running');
  await waitFor(() => h.find(run.id, (m) => m.kind === 'agent' && m.text.includes('<img')), 8000, 'jawaban skenario html');
});

test('start: perintah bukan sesi atau teks kosong ditolak sebelum sesi mana pun jalan', async (t) => {
  const h = await setup(); t.after(h.close);
  const { dir } = tmpProject();
  assert.equal(thrown(() => h.ff.start({ projectDir: dir, command: cmd({ kind: 'backlog', needsText: false }), prompt: '' })).status, 400);
  assert.equal(thrown(() => h.ff.start({ projectDir: dir, command: cmd({}), prompt: '  ' })).code, 'command_needs_text');
  assert.equal(h.harness.activeRunId(dir), null);
});

test('giliran selesai lalu sepi: sesi ditutup dan run done', async (t) => {
  const h = await setup(); t.after(h.close);
  const { dir } = tmpProject();
  const run = h.ff.start({ projectDir: dir, command: cmd({}), prompt: 'halo' });
  await waitFor(() => h.run(run.id).status === 'done', 8000, 'run done');
  assert.equal(h.run(run.id).endedAt !== null, true);
});

test('pesan pemilik dalam masa tunggu membatalkan penutupan (giliran baru belum selesai = run tetap jalan)', async (t) => {
  const h = await setup(600); t.after(h.close);
  const { dir } = tmpProject();
  const run = h.ff.start({ projectDir: dir, command: cmd({}), prompt: 'halo' });
  await waitFor(() => h.find(run.id, (m) => m.text === 'halo dari fake'), 8000, 'giliran selesai');
  h.harness.sendMessage(run.id, 'masih ada lagi'); // claude tiruan tidak menjawab pesan lanjutan
  await new Promise((r) => setTimeout(r, 1000)); // > graceMs
  assert.equal(h.run(run.id).status, 'running');
});

test('TeamCatalog.command memberi perintah lengkap (dengan template) dari tim fixture', () => {
  const c = createCatalog([path.join(import.meta.dirname, 'fixtures', 'teams')]);
  const t = c.get('tiruan')!;
  assert.equal(c.command(t, 'bebas')?.template, '{prompt}');
  assert.equal(c.command(t, 'zz'), undefined);
});
