// Seam: Harness lewat interface publiknya (startRun/answer/sendMessage/pause/resume/stop) terhadap `claude` tiruan.
// Setiap skenario meniru skenario spike/probe.mjs. Bukti berupa file di folder proyek dan isi Store, bukan internal Harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HarnessError } from '../src/harness/index.js';
import { setupHarness, tmpProject, waitFor } from './helpers.js';

const thrown = (f: () => unknown) => { try { f(); } catch (e) { return e as HarnessError; } throw new Error('tidak melempar'); };
const terminal = (s: string) => ['done', 'failed', 'stopped', 'disconnected'].includes(s);

test('run biasa: berjalan lalu selesai, token dan pesan tercatat, event berurutan', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: 'tes [ok]' });
  assert.equal(r.status, 'running');
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'run selesai');
  const run = h.run(r.id);
  assert.equal(run.status, 'done');
  assert.equal(run.sessionId, 'sess-fake');
  assert.deepEqual(run.tokens, { input: 10, output: 5, cacheRead: 3, cacheWrite: 2 });
  assert.ok(run.durationMs! >= 0 && run.endedAt);
  assert.equal(h.find(r.id, (m) => m.kind === 'agent')?.text, 'halo dari fake');
  assert.equal(h.messages(r.id).at(-1)?.text, 'Run selesai.');
  const ev = h.store.eventsAfter(r.id, 0);
  assert.ok(ev.length >= 4);
  assert.deepEqual(ev.map((e) => e.seq), [...ev.map((e) => e.seq)].sort((a, b) => a - b));
  assert.equal(ev[0].type, 'run');
});

test('pertanyaan berpilihan: jawaban sampai ke agent, jawaban kedua ditolak (first-wins)', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[tanya]' });
  const q = await waitFor(() => h.find(r.id, (m) => m.kind === 'question'), 8000, 'pertanyaan');
  assert.equal(q.state, 'pending');
  assert.deepEqual(q.questions![0].options.map((o) => o.label), ['Merah', 'Biru']);
  assert.equal(h.run(r.id).status, 'needs_owner');
  assert.equal(h.run(r.id).pending, 1);

  // jawaban yang tidak cocok dengan pertanyaan ditolak dan pertanyaan tetap menunggu
  assert.equal(thrown(() => h.harness.answer(r.id, q.id, { kind: 'question', answers: { 'Lain?': 'x' } })).code, 'invalid_answer');
  assert.equal(thrown(() => h.harness.answer(r.id, q.id, { kind: 'permission', decision: 'allow' })).code, 'wrong_kind');

  h.harness.answer(r.id, q.id, { kind: 'question', answers: { 'Warna favorit?': 'Biru' } });
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'selesai');
  assert.equal(fs.readFileSync(path.join(dir, 'jawaban.txt'), 'utf8'), 'Biru');
  assert.equal(h.store.getMessage(q.id)!.state, 'answered');
  const again = thrown(() => h.harness.answer(r.id, q.id, { kind: 'question', answers: { 'Warna favorit?': 'Merah' } }));
  assert.equal(again.code, 'already_answered');
  assert.equal(again.details?.answeredFrom, 'dashboard');
});

test('jawaban bebas dan multi-pilih diteruskan dalam format yang sama', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[tanya]' });
  const q = await waitFor(() => h.find(r.id, (m) => m.kind === 'question'), 8000, 'pertanyaan');
  h.harness.answer(r.id, q.id, { kind: 'question', answers: { 'Warna favorit?': ['Merah', 'Biru', 'Hijau (ketik sendiri)'] } });
  await waitFor(() => terminal(h.run(r.id).status));
  assert.equal(fs.readFileSync(path.join(dir, 'jawaban.txt'), 'utf8'), 'Merah, Biru, Hijau (ketik sendiri)');
});

test('izin A3: di dalam folder otomatis, di luar folder ditanyakan; Tolak dengan alasan sampai ke agent', async (t) => {
  const h = await setupHarness({ maxRuns: 2 }); t.after(h.close);
  const a = tmpProject();
  const r = h.harness.startRun({ projectDir: a.dir, prompt: '[izin]' });
  const p = await waitFor(() => h.find(r.id, (m) => m.kind === 'permission'), 8000, 'izin');
  assert.equal(fs.readFileSync(path.join(a.dir, 'dalam.txt'), 'utf8'), '1'); // otomatis tanpa pesan izin
  assert.equal(h.messages(r.id).filter((m) => m.kind === 'permission').length, 1);
  assert.equal(p.tool?.name, 'Write');
  assert.match(p.tool!.why, /di luar folder proyek/);
  h.harness.answer(r.id, p.id, { kind: 'permission', decision: 'deny', reason: 'jangan menulis di luar' });
  await waitFor(() => terminal(h.run(r.id).status));
  assert.equal(h.find(r.id, (m) => m.kind === 'agent')?.text, 'izin:deny:Ditolak pemilik: jangan menulis di luar');
  assert.equal(h.store.getMessage(p.id)!.answer?.decision, 'deny');

  const b = tmpProject();
  const r2 = h.harness.startRun({ projectDir: b.dir, prompt: '[izin]' });
  const p2 = await waitFor(() => h.find(r2.id, (m) => m.kind === 'permission'), 8000, 'izin 2');
  h.harness.answer(r2.id, p2.id, { kind: 'permission', decision: 'allow' });
  await waitFor(() => terminal(h.run(r2.id).status));
  assert.equal(h.find(r2.id, (m) => m.kind === 'agent')?.text, 'izin:allow');
});

test('pesan pemilik masuk ke sesi yang sedang jalan', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[pesan]' });
  await waitFor(() => h.store.eventsAfter(r.id, 0).some((e) => e.type === 'tool'), 8000, 'langkah alat');
  const m = h.harness.sendMessage(r.id, 'tambah nanas.txt');
  assert.equal(m.state, 'sent');
  await waitFor(() => terminal(h.run(r.id).status));
  assert.equal(fs.readFileSync(path.join(dir, 'pesan.txt'), 'utf8'), 'tambah nanas.txt');
});

test('chat berkelanjutan: pesan setelah giliran selesai melanjutkan sesi yang sama (run sama, --resume)', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: 'tes [ok]', model: 'haiku' });
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'giliran 1');
  assert.equal(h.run(r.id).status, 'done');
  const m = h.harness.sendMessage(r.id, 'lanjutkan ya');
  assert.equal(m.kind, 'owner');
  assert.equal(m.state, 'sent');
  assert.equal(h.run(r.id).status, 'running');
  assert.equal(h.run(r.id).endedAt, null);
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'giliran 2');
  const run = h.run(r.id);
  assert.equal(run.status, 'done');
  assert.equal(run.sessionId, 'sess-fake'); // sesi sama
  assert.equal(h.messages(r.id).filter((x) => x.kind === 'agent').at(-1)?.text, 'lanjut:sess-fake:lanjutkan ya:haiku');
  // giliran ketiga juga bisa
  h.harness.sendMessage(r.id, 'sekali lagi');
  await waitFor(() => h.messages(r.id).some((x) => x.text.includes(':sekali lagi:')), 8000, 'giliran 3');
  await waitFor(() => terminal(h.run(r.id).status));
});

test('chat berkelanjutan: ditolak bila proyek sedang dipakai run lain atau run tak punya sesi', async (t) => {
  const h = await setupHarness({ maxRuns: 2 }); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[ok]' });
  await waitFor(() => terminal(h.run(r.id).status));
  const r2 = h.harness.startRun({ projectDir: dir, prompt: '[stop]' }); // proyek yang sama dipakai run lain
  assert.equal(thrown(() => h.harness.sendMessage(r.id, 'halo')).code, 'project_busy');
  assert.equal(h.messages(r.id).some((x) => x.kind === 'owner'), false); // tidak ada pesan tersimpan bila gagal
  h.harness.stop(r2.id);
  await waitFor(() => terminal(h.run(r2.id).status));
  const h2 = await setupHarness({ bin: 'program-tidak-ada-xyz', binArgs: [] }); t.after(h2.close);
  const c = h2.harness.startRun({ projectDir: dir, prompt: 'x' }); // gagal sebelum sesi terbentuk
  await waitFor(() => terminal(h2.run(c.id).status));
  assert.equal(h2.run(c.id).sessionId, null);
  assert.equal(thrown(() => h2.harness.sendMessage(c.id, 'halo')).code, 'run_not_active');
});

test('Jeda menahan langkah berikutnya; pesan saat Jeda terkirim saat Lanjut; sesi sama', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[jeda]' });
  await waitFor(() => fs.existsSync(path.join(dir, 'a.txt')), 8000, 'a.txt');
  h.harness.pause(r.id);
  assert.equal(h.run(r.id).status, 'paused');
  await new Promise((res) => setTimeout(res, 1000)); // lebih lama dari celah antar-langkah (400 ms)
  assert.equal(fs.existsSync(path.join(dir, 'b.txt')), false);
  const m = h.harness.sendMessage(r.id, 'catatan saat jeda');
  assert.equal(m.state, 'queued');
  h.harness.resume(r.id);
  assert.equal(h.store.getMessage(m.id)!.state, 'sent');
  assert.equal(h.store.getMessage(m.id)!.sentOnResume, true);
  await waitFor(() => terminal(h.run(r.id).status));
  for (const f of ['a', 'b', 'c']) assert.ok(fs.existsSync(path.join(dir, f + '.txt')), f);
  assert.equal(h.run(r.id).sessionId, 'sess-fake');
  assert.equal(h.run(r.id).status, 'done');
});

test('Stop menghentikan run dalam 10 detik, pekerjaan di folder tetap ada, pertanyaan menggantung dibatalkan', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  fs.writeFileSync(path.join(dir, 'belum-commit.txt'), 'penting');
  const r = h.harness.startRun({ projectDir: dir, prompt: '[stop]' });
  await waitFor(() => h.store.eventsAfter(r.id, 0).some((e) => e.type === 'tool'), 8000, 'langkah alat');
  const t0 = Date.now();
  h.harness.stop(r.id);
  await waitFor(() => terminal(h.run(r.id).status), 10000, 'berhenti');
  assert.ok(Date.now() - t0 < 10000);
  assert.equal(h.run(r.id).status, 'stopped');
  assert.equal(fs.readFileSync(path.join(dir, 'belum-commit.txt'), 'utf8'), 'penting');
  assert.equal(h.harness.stop(r.id).status, 'stopped'); // idempoten
});

test('Stop pada claude yang tidak mau berhenti: dimatikan paksa', async (t) => {
  const h = await setupHarness({ stopSoftMs: 200, stopKillMs: 700 }); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[stop-hang]' });
  await waitFor(() => h.store.eventsAfter(r.id, 0).some((e) => e.type === 'tool'), 8000, 'langkah alat');
  h.harness.stop(r.id);
  await waitFor(() => terminal(h.run(r.id).status), 10000, 'dimatikan paksa');
  assert.equal(h.run(r.id).status, 'stopped');
});

test('proses claude mati mendadak: Gagal dengan alasan dan log terakhir', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[crash]' });
  await waitFor(() => terminal(h.run(r.id).status));
  const run = h.run(r.id);
  assert.equal(run.status, 'failed');
  assert.match(run.reason!, /kode 3/);
  assert.match(run.lastLog!, /boom/);
});

test('program claude tidak ditemukan: Gagal dengan pesan jelas', async (t) => {
  const h = await setupHarness({ bin: 'claude-tidak-ada-xyz', binArgs: [] }); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: 'x' });
  await waitFor(() => terminal(h.run(r.id).status));
  assert.equal(h.run(r.id).status, 'failed');
  assert.match(h.run(r.id).lastLog!, /tidak ditemukan/);
});

test('pertanyaan yang dibatalkan claude (dijawab di tempat lain) tampil dibatalkan, bukan menggantung', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[cancel]' });
  const q = await waitFor(() => h.find(r.id, (m) => m.kind === 'question'), 8000, 'pertanyaan');
  await waitFor(() => h.store.getMessage(q.id)!.state === 'cancelled', 8000, 'dibatalkan');
  assert.equal(h.store.getMessage(q.id)!.answer?.from, 'agent');
  assert.equal(thrown(() => h.harness.answer(r.id, q.id, { kind: 'question', answers: { 'Warna favorit?': 'Biru' } })).code, 'already_answered');
  await waitFor(() => terminal(h.run(r.id).status));
});

test('satu run aktif per proyek dan batas jumlah run', async (t) => {
  const h = await setupHarness({ maxRuns: 1 }); t.after(h.close);
  const a = tmpProject('a');
  const r = h.harness.startRun({ projectDir: a.dir, prompt: '[stop]' });
  const busy = thrown(() => h.harness.startRun({ projectDir: a.dir, prompt: '[ok]' }));
  assert.equal(busy.code, 'project_busy');
  assert.equal(busy.details?.activeRunId, r.id);
  const other = tmpProject('b');
  assert.equal(thrown(() => h.harness.startRun({ projectDir: other.dir, prompt: '[ok]' })).code, 'capacity');
  h.harness.stop(r.id);
  await waitFor(() => terminal(h.run(r.id).status), 10000);
  const again = h.harness.startRun({ projectDir: a.dir, prompt: '[ok]' }); // proyek bebas lagi
  await waitFor(() => terminal(h.run(again.id).status));
});

test('server berhenti: run Terputus, bukan Gagal; start ulang menandai sisa run hidup sebagai Terputus', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[stop]' });
  await waitFor(() => h.store.eventsAfter(r.id, 0).some((e) => e.type === 'tool'), 8000);
  h.harness.shutdown();
  await waitFor(() => terminal(h.run(r.id).status), 10000);
  assert.equal(h.run(r.id).status, 'disconnected');

  // sisa data dari proses server yang mati mendadak (tanpa shutdown): masih "running" di penyimpanan
  const stale = { ...h.run(r.id), id: 'stale', status: 'running' as const, endedAt: null, durationMs: null, reason: null };
  h.store.saveRun(stale);
  assert.equal(h.store.markDisconnected(), 1);
  assert.equal(h.run('stale').status, 'disconnected');
});
