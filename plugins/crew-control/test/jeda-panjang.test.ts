// Seam: Harness (pause/resume/sendMessage/stop) terhadap `claude` tiruan, dengan jam tiruan untuk batas Jeda 50 menit (ARCHITECTURE 7.E).
// Bukti: proses hidup/tidak (isOwnSession), status di Store, file di folder proyek, teks yang diterima claude tiruan saat --resume.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HarnessError } from '../src/harness/index.js';
import { setupHarness, tmpProject, waitFor } from './helpers.js';

const MIN50 = 50 * 60_000;
const terminal = (s: string) => ['done', 'failed', 'stopped', 'disconnected'].includes(s);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    setTimeout: (fn: () => void, ms: number) => { timers.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout: (h: unknown) => { timers.delete(h as number); },
    advance(ms: number) {
      now += ms;
      for (const [k, t] of [...timers]) if (t.at <= now) { timers.delete(k); t.fn(); }
    },
  };
}

/** Run [jeda] yang sudah menulis a.txt lalu dijeda; hook langkah b ditahan. */
async function pausedRun() {
  const clock = fakeClock();
  const h = await setupHarness({ clock });
  const { dir } = tmpProject();
  fs.writeFileSync(path.join(dir, 'belum-commit.txt'), 'penting');
  const r = h.harness.startRun({ projectDir: dir, prompt: '[jeda]' });
  await waitFor(() => fs.existsSync(path.join(dir, 'a.txt')), 8000, 'a.txt');
  h.harness.pause(r.id);
  await sleep(600); // langkah b sampai ke hook dan ditahan
  return { h, clock, dir, r, sid: r.sessionId! };
}

test('Jeda < 50 menit: proses tetap hidup; tepat 50 menit: interrupt, proses ditutup, run tetap paused', async (t) => {
  const { h, clock, dir, r, sid } = await pausedRun(); t.after(h.close);
  clock.advance(MIN50 - 1);
  await sleep(300);
  assert.equal(h.harness.isOwnSession(sid), true);
  clock.advance(1);
  await waitFor(() => !h.harness.isOwnSession(sid), 8000, 'proses ditutup');
  await sleep(300);
  const run = h.run(r.id);
  assert.equal(run.status, 'paused');
  assert.equal(run.endedAt, null);
  assert.equal(run.sessionId, sid);
  assert.equal(fs.existsSync(path.join(dir, 'b.txt')), false); // langkah tertahan tidak dijalankan
  assert.equal(fs.readFileSync(path.join(dir, 'belum-commit.txt'), 'utf8'), 'penting');
  assert.ok(!h.messages(r.id).some((m) => m.kind === 'system' && /gagal|selesai|dihentikan/i.test(m.text)));
  // sesi terlepas tetap memegang proyek: run lain ditolak
  const e = (() => { try { h.harness.startRun({ projectDir: dir, prompt: '[ok]' }); } catch (x) { return x as HarnessError; } })();
  assert.equal(e?.code, 'project_busy');
  assert.equal(h.harness.activeRunId(dir), r.id);
  assert.equal(h.harness.pause(r.id).status, 'paused'); // Jeda lagi: tanpa efek
});

test('Lanjut dari sesi terlepas: --resume sesi yang sama dengan pesan antrean', async (t) => {
  const { h, clock, r, sid } = await pausedRun(); t.after(h.close);
  const early = h.harness.sendMessage(r.id, 'catatan sebelum lepas');
  clock.advance(MIN50);
  await waitFor(() => !h.harness.isOwnSession(sid), 8000, 'proses ditutup');
  const late = h.harness.sendMessage(r.id, 'catatan sesudah lepas');
  assert.equal(late.state, 'queued');
  assert.equal(h.store.getMessage(early.id)!.state, 'queued'); // antrean tidak hilang saat proses ditutup
  const resumed = h.harness.resume(r.id);
  assert.equal(resumed.status, 'running');
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'selesai');
  assert.equal(h.run(r.id).status, 'done');
  assert.equal(h.run(r.id).sessionId, sid);
  const agent = h.messages(r.id).filter((m) => m.kind === 'agent').at(-1)!;
  assert.equal(agent.text, `lanjut:${sid}:catatan sebelum lepas\n\ncatatan sesudah lepas:fake`);
  for (const m of [early, late]) {
    assert.equal(h.store.getMessage(m.id)!.state, 'sent');
    assert.equal(h.store.getMessage(m.id)!.sentOnResume, true);
  }
});

test('Lanjut dari sesi terlepas tanpa antrean: pesan "Lanjutkan."', async (t) => {
  const { h, clock, r, sid } = await pausedRun(); t.after(h.close);
  clock.advance(MIN50);
  await waitFor(() => !h.harness.isOwnSession(sid), 8000, 'proses ditutup');
  h.harness.resume(r.id);
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'selesai');
  assert.equal(h.messages(r.id).filter((m) => m.kind === 'agent').at(-1)!.text, `lanjut:${sid}:Lanjutkan.:fake`);
});

test('Stop pada sesi terlepas: langsung stopped, antrean dibatalkan, pekerjaan tetap, proyek bebas', async (t) => {
  const { h, clock, dir, r, sid } = await pausedRun(); t.after(h.close);
  clock.advance(MIN50);
  await waitFor(() => !h.harness.isOwnSession(sid), 8000, 'proses ditutup');
  const q = h.harness.sendMessage(r.id, 'tidak jadi');
  const t0 = Date.now();
  assert.equal(h.harness.stop(r.id).status, 'stopped');
  assert.ok(Date.now() - t0 < 10000);
  assert.equal(h.run(r.id).status, 'stopped');
  assert.ok(h.run(r.id).endedAt);
  assert.equal(h.store.getMessage(q.id)!.state, 'cancelled');
  assert.equal(h.messages(r.id).at(-1)?.text, 'Run dihentikan.');
  assert.ok(fs.existsSync(path.join(dir, 'a.txt')));
  assert.equal(fs.readFileSync(path.join(dir, 'belum-commit.txt'), 'utf8'), 'penting');
  assert.equal(h.harness.activeRunId(dir), null);
  assert.equal(h.harness.stop(r.id).status, 'stopped'); // idempoten
  assert.throws(() => h.harness.resume(r.id), (e: HarnessError) => e.code === 'run_not_active');
});

test('Stop saat Jeda (sebelum 50 menit) tetap berhenti < 10 dtk; jam lewat 50 menit sesudahnya tidak mengubah apa pun', async (t) => {
  const { h, clock, dir, r } = await pausedRun(); t.after(h.close);
  const t0 = Date.now();
  h.harness.stop(r.id);
  await waitFor(() => terminal(h.run(r.id).status), 10000, 'berhenti');
  assert.ok(Date.now() - t0 < 10000);
  assert.equal(h.run(r.id).status, 'stopped');
  assert.equal(fs.existsSync(path.join(dir, 'b.txt')), false);
  clock.advance(MIN50 * 2);
  assert.equal(h.run(r.id).status, 'stopped');
});

test('Lanjut sebelum 50 menit membatalkan pelepasan: sesi sama berlanjut sampai selesai', async (t) => {
  const { h, clock, dir, r } = await pausedRun(); t.after(h.close);
  h.harness.resume(r.id);
  clock.advance(MIN50 * 2);
  await waitFor(() => terminal(h.run(r.id).status), 8000, 'selesai');
  assert.equal(h.run(r.id).status, 'done');
  for (const f of ['a', 'b', 'c']) assert.ok(fs.existsSync(path.join(dir, f + '.txt')), f);
  assert.equal(h.messages(r.id).filter((m) => m.kind === 'agent').length, 0); // tidak ada --resume
});
