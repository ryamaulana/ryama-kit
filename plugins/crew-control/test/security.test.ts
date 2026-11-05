// Seam: createApp (inject HTTP) untuk aturan jaringan sc01 + createRateLimiter (jam disuntik) + Store.replayAndSubscribe.
// Menangkap: pengguna Tailscale, CSP berkas tampilan, 429 per alamat, hook dikecualikan, batas replay 5000.
// Terlewat: perilaku tailscale serve asli (header diisi proxy) dan CSP di hasil build Vite /app/ (rute statis yang sama-sama HTML).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Harness } from '../src/harness/index.js';
import { createApp, type AppOptions } from '../src/server.js';
import { createRateLimiter } from '../src/security.js';
import { Store } from '../src/store/index.js';
import type { Run } from '../src/contract/index.js';
import { FAKE, tmpProject } from './helpers.js';

function setup(extra: Partial<AppOptions> = {}) {
  const { root } = tmpProject('app');
  const store = new Store(':memory:');
  const harness = new Harness({ store, hookBaseUrl: 'http://127.0.0.1:1', bin: process.execPath, binArgs: [FAKE], maxRuns: 1 });
  const app = createApp({ store, harness, workRoot: root, maxRuns: 1, ...extra });
  return { root, store, app, close: async () => { harness.shutdown(); await app.close(); } };
}

const TS_HOST = 'laptop.tail1234.ts.net';

test('CREW_TAILSCALE_USERS: Host *.ts.net wajib Tailscale-User-Login yang terdaftar (403 forbidden_user)', async (t) => {
  const s = setup({ tailscaleUsers: ['pemilik@example.com'] }); t.after(s.close);
  const get = (headers: Record<string, string>, remoteAddress = '127.0.0.1') =>
    s.app.inject({ method: 'GET', url: '/api/health', headers, remoteAddress });
  assert.equal((await get({ host: TS_HOST, 'tailscale-user-login': 'pemilik@example.com' })).statusCode, 200);
  assert.equal((await get({ host: TS_HOST, 'tailscale-user-login': 'Pemilik@Example.com' })).statusCode, 200); // email tidak peka huruf
  for (const headers of <Record<string, string>[]>[{ host: TS_HOST }, { host: TS_HOST, 'tailscale-user-login': 'tamu@example.com' }, { host: `${TS_HOST}:443`, 'tailscale-user-login': '' }]) {
    const r = await get(headers);
    assert.equal(r.statusCode, 403, JSON.stringify(headers));
    assert.deepEqual(r.json().error.code, 'forbidden_user');
  }
  // Header hanya dipercaya dari tailscale serve (loopback); peer tailnet langsung bisa memalsukannya.
  const direct = await get({ host: TS_HOST, 'tailscale-user-login': 'pemilik@example.com' }, '100.101.102.103');
  assert.equal(direct.statusCode, 403);
  assert.equal(direct.json().error.code, 'forbidden_user');
  // Host localhost tidak terkena aturan ini.
  assert.equal((await get({ host: 'localhost:4780' })).statusCode, 200);
  // POST juga ditolak sebelum sampai ke rute.
  const post = await s.app.inject({ method: 'POST', url: '/api/runs/x/stop', payload: '{}', headers: { host: TS_HOST, 'content-type': 'application/json' }, remoteAddress: '127.0.0.1' });
  assert.equal(post.json().error.code, 'forbidden_user');
});

test('tanpa CREW_TAILSCALE_USERS: Host *.ts.net tidak butuh header', async (t) => {
  const s = setup(); t.after(s.close);
  const r = await s.app.inject({ method: 'GET', url: '/api/health', headers: { host: TS_HOST }, remoteAddress: '100.101.102.103' });
  assert.equal(r.statusCode, 200);
});

test('CSP bagian 10 pada respons berkas tampilan', async (t) => {
  const { root } = tmpProject('web');
  const webDir = path.join(root, 'web');
  fs.writeFileSync(path.join(webDir, 'index.html'), '<!doctype html><title>x</title>');
  const s = setup({ webDir }); t.after(s.close);
  const r = await s.app.inject({ method: 'GET', url: '/', headers: { host: 'localhost:4780' } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.headers['content-security-policy'],
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
});

test('batas laju: 60 permintaan pengubah per menit per alamat, ke-61 -> 429 rate_limited', async (t) => {
  const s = setup(); t.after(s.close);
  const post = (remoteAddress: string, url = '/api/runs/x/stop') =>
    s.app.inject({ method: 'POST', url, payload: '{}', headers: { host: 'localhost:4780', 'content-type': 'application/json' }, remoteAddress });
  for (let i = 0; i < 60; i++) assert.equal((await post('127.0.0.1')).json().error.code, 'not_found', `ke-${i + 1}`);
  const r = await post('127.0.0.1');
  assert.equal(r.statusCode, 429);
  assert.equal(r.json().error.code, 'rate_limited');
  assert.equal(typeof r.json().error.message, 'string');
  assert.equal((await post('100.101.102.103')).json().error.code, 'not_found'); // alamat lain punya jatah sendiri
  assert.equal((await s.app.inject({ method: 'GET', url: '/api/health', headers: { host: 'localhost:4780' } })).statusCode, 200); // GET tidak dibatasi
  assert.notEqual((await post('127.0.0.1', '/hook/abc')).statusCode, 429); // hook claude (loopback + token) tidak ikut dibatasi
});

test('createRateLimiter: jendela 60 dtk bergeser', () => {
  let now = 0;
  const allow = createRateLimiter(60, 60_000, () => now);
  for (let i = 0; i < 60; i++) { assert.equal(allow('a'), true); now += 500; } // 60 permintaan dalam 30 dtk
  assert.equal(allow('a'), false);
  now = 59_999; assert.equal(allow('a'), false); // permintaan pertama (t=0) masih dalam jendela
  now = 60_000; assert.equal(allow('a'), true); // t=0 keluar dari jendela
  assert.equal(allow('a'), false);
});

test('SSE replay maksimal 5000 event per sambungan', () => {
  const store = new Store(':memory:');
  const run: Run = {
    id: 'r1', project: 'C:\\p', projectName: 'p', prompt: 'x', model: 'sonnet', origin: 'dashboard', status: 'running', reason: null, lastLog: null,
    sessionId: null, pending: 0, tokens: null, startedAt: new Date(0).toISOString(), endedAt: null, durationMs: null,
  };
  for (let i = 0; i < 5003; i++) store.saveRun(run);
  let n = 0;
  store.replayAndSubscribe('r1', 0, () => n++)();
  assert.equal(n, 5000);
  store.close();
});
