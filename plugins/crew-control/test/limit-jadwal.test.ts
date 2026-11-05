// Seam: Harness (limit -> limit_paused -> lanjut otomatis) dan restart (restoreLimitPaused + markDisconnected), claude tiruan + jam tiruan.
// Harapan dari ARCHITECTURE 7.F: reset + 60 dtk; jam tak terbaca = 30 mnt; run yang sama, --resume sesi yang sama.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Harness } from '../src/harness/index.js';
import { FAKE, setupHarness, tmpProject, waitFor } from './helpers.js';

function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    setTimeout: (fn: () => void, ms: number) => { timers.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout: (h: unknown) => { timers.delete(h as number); },
    pending: () => timers.size,
    advance(ms: number) { now += ms; for (const [k, t] of [...timers]) if (t.at <= now) { timers.delete(k); t.fn(); } },
  };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const resumed = (h: Awaited<ReturnType<typeof setupHarness>>, id: string, sid: string) =>
  h.messages(id).some((m) => m.text.startsWith(`lanjut:${sid}:Lanjutkan.:`));

async function limitedRun(epochAhead: number | null) {
  process.env.FAKE_LIMIT_EPOCH = epochAhead === null ? '' : String(Math.ceil(Date.now() / 1000) + epochAhead);
  const clock = fakeClock();
  const h = await setupHarness({ clock });
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[limit]' });
  await waitFor(() => h.run(r.id).status === 'limit_paused', 8000, 'limit_paused');
  await sleep(200);
  return { h, clock, dir, r, sid: h.run(r.id).sessionId! };
}

test('limit dengan jam reset: limit_paused + limitResetAt, tidak lanjut sebelum reset+60 dtk, lanjut tepat sesudahnya (run sama, --resume)', async (t) => {
  const { h, clock, dir, r, sid } = await limitedRun(600); t.after(h.close);
  const run = h.run(r.id) as ReturnType<typeof h.run> & { limitResetAt: string };
  assert.equal(run.status, 'limit_paused');
  assert.ok(Math.abs(Date.parse(run.limitResetAt) - Date.now() - 600_000) < 2500);
  assert.equal(run.endedAt, null);
  assert.equal(h.harness.activeRunId(dir), r.id); // tetap memegang proyek
  assert.ok(h.messages(r.id).some((m) => m.kind === 'system' && /Batas pemakaian/.test(m.text)));
  clock.advance(659_000); // reset + 59 dtk (selisih <= 1 dtk dari pembulatan epoch)
  await sleep(300);
  assert.equal(h.run(r.id).status, 'limit_paused');
  clock.advance(2_000);
  await waitFor(() => resumed(h, r.id, sid), 8000, 'lanjut --resume');
  await waitFor(() => h.run(r.id).status === 'done', 8000, 'run selesai');
  assert.equal(h.run(r.id).id, r.id);
  assert.equal((h.run(r.id) as any).limitResetAt ?? null, null);
});

test('jam reset tak terbaca: dicoba tiap 30 menit, bukan lebih cepat', async (t) => {
  const { h, clock, r, sid } = await limitedRun(null); t.after(h.close);
  assert.equal((h.run(r.id) as any).limitResetAt, null);
  clock.advance(30 * 60_000 - 1);
  await sleep(300);
  assert.equal(h.run(r.id).status, 'limit_paused');
  clock.advance(1);
  await waitFor(() => resumed(h, r.id, sid), 8000, 'lanjut 30 mnt');
});

test('Stop saat limit_paused: berhenti, jadwal dibatalkan', async (t) => {
  const { h, clock, r } = await limitedRun(600); t.after(h.close);
  h.harness.stop(r.id);
  assert.equal(h.run(r.id).status, 'stopped');
  assert.equal(clock.pending(), 0);
});

test('restart: limit_paused ber-sesi tidak jadi disconnected; server baru menjadwal ulang dan melanjutkan run yang sama', async (t) => {
  const { h, r, sid } = await limitedRun(600);
  h.harness.shutdown(); // "server mati": proses tidak ada, data tetap
  assert.equal(h.store.markDisconnected(), 0);
  assert.equal(h.run(r.id).status, 'limit_paused');
  const clock2 = fakeClock();
  const h2 = new Harness({ store: h.store, hookBaseUrl: 'http://127.0.0.1:9', bin: process.execPath, binArgs: [FAKE], clock: clock2 });
  t.after(() => { h2.shutdown(); h.close(); });
  assert.equal(h2.restoreLimitPaused(), 1);
  assert.equal(h2.activeRunId(h.run(r.id).project), r.id);
  clock2.advance(659_000);
  await sleep(300);
  assert.equal(h.run(r.id).status, 'limit_paused');
  clock2.advance(2_000);
  await waitFor(() => resumed(h, r.id, sid), 8000, 'lanjut setelah restart');
});

test('restart: proses hilang -> disconnected; tanpa sesi tetap utuh; Lanjutkan memakai --resume + pesan sistem', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  const { dir } = tmpProject();
  const r = h.harness.startRun({ projectDir: dir, prompt: '[ok]' });
  await waitFor(() => h.run(r.id).status === 'done');
  const base = h.run(r.id);
  h.store.saveRun({ ...base, status: 'running', endedAt: null, durationMs: null });
  h.store.saveRun({ ...base, id: 'tanpa-sesi', status: 'needs_owner', sessionId: null, endedAt: null, durationMs: null });
  assert.equal(h.store.markDisconnected(), 1);
  assert.equal(h.run(r.id).status, 'disconnected');
  assert.equal(h.run('tanpa-sesi').status, 'needs_owner');
  h.harness.continueFailed(r.id);
  await waitFor(() => h.messages(r.id).some((m) => m.text.startsWith(`lanjut:${base.sessionId}:Lanjutkan pekerjaan sebelumnya.:`)), 8000, 'resume');
  assert.ok(h.messages(r.id).some((m) => m.kind === 'system' && m.text === 'Dilanjutkan di sesi baru.'));
});
