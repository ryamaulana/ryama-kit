const test = require('node:test');
const assert = require('node:assert');
const guard = require('../../server/guard');

const path = require('path');
const { Readable } = require('stream');

const PORT = 4777;
const PUB = path.resolve(__dirname, 'fake-public');
const req = (headers, method = 'GET') => ({ method, headers });

test('checkRequest: Host lokal dengan port viewer diterima, selain itu 403 bad_host', () => {
  for (const host of ['localhost:4777', '127.0.0.1:4777', '[::1]:4777', 'LOCALHOST:4777']) {
    assert.strictEqual(guard.checkRequest(req({ host }), PORT), null, host);
  }
  // DNS rebinding: nama domain penyerang menunjuk ke 127.0.0.1.
  for (const host of ['evil.com:4777', 'localhost:4778', 'localhost', '127.0.0.1', 'localhost.evil.com:4777', '0.0.0.0:4777', '', undefined]) {
    const r = guard.checkRequest(req({ host }), PORT);
    assert.deepStrictEqual(r && [r.status, r.code], [403, 'bad_host'], String(host));
  }
});

test('checkRequest: POST tanpa Origin (hook, skrip uji) dan dari viewer sendiri diterima', () => {
  const host = 'localhost:4777';
  assert.strictEqual(guard.checkRequest(req({ host }, 'POST'), PORT), null, 'hook tanpa Origin');
  assert.strictEqual(guard.checkRequest(req({ host, origin: 'http://localhost:4777', 'sec-fetch-site': 'same-origin' }, 'POST'), PORT), null);
  assert.strictEqual(guard.checkRequest(req({ host: '127.0.0.1:4777', origin: 'http://127.0.0.1:4777' }, 'POST'), PORT), null);
});

test('checkRequest: POST lintas-origin (CSRF) ditolak 403 bad_origin', () => {
  const host = 'localhost:4777';
  const cases = [
    { origin: 'https://evil.com' },
    { origin: 'null' }, // iframe sandbox / file://
    { origin: 'http://localhost:3000' }, // situs lain di localhost
    { origin: 'http://127.0.0.1:4777' }, // origin lokal tapi bukan origin halaman ini
    { origin: 'https://localhost:4777' },
    { 'sec-fetch-site': 'cross-site' }, // Origin dibuang, tapi browser tetap menandai
    { 'sec-fetch-site': 'same-site' }, // port lain di localhost
  ];
  for (const extra of cases) {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const r = guard.checkRequest(req({ host, ...extra }, method), PORT);
      assert.deepStrictEqual(r && [r.status, r.code], [403, 'bad_origin'], method + ' ' + JSON.stringify(extra));
    }
  }
});

test('checkRequest: GET tidak diperiksa Origin (navigasi biasa), tetapi tetap diperiksa Host', () => {
  assert.strictEqual(guard.checkRequest(req({ host: 'localhost:4777', 'sec-fetch-site': 'none' }), PORT), null);
  const r = guard.checkRequest(req({ host: 'evil.com', origin: 'https://evil.com' }), PORT);
  assert.strictEqual(r.code, 'bad_host');
});

test('parseP: kosong = null (proyek terbaru), bentuk benar dikembalikan, salah bentuk = false', () => {
  for (const s of [undefined, null, '']) assert.strictEqual(guard.parseP(s), null, String(s));
  for (const s of ['flow-viewer', 'a', 'my.app_2', 'flow-viewer-1a2b3c', 'a'.repeat(64)]) assert.strictEqual(guard.parseP(s), s);
  const bad = ['../etc', 'Flow', '-x', '.git', 'a/b', 'a\\b', 'C:', 'a b', 'a\0', 'a'.repeat(65), '<script>', ['a']];
  for (const s of bad) assert.strictEqual(guard.parseP(s), false, JSON.stringify(s));
});

test('parseNodeId: id khusus dan id agent sah dikembalikan, lainnya null (400 bad_id)', () => {
  for (const s of ['__main', '__all', '__convo', 'be', 'ui-designer', 'be:2', 'task:a1.b_c', 'a'.repeat(64)]) {
    assert.strictEqual(guard.parseNodeId(s), s);
  }
  const bad = [undefined, null, '', '__proto__', '__x', 'BE', ':be', '../be', 'a/b', 'a\\b', 'a b', '<img>', 'a'.repeat(65), ['be']];
  for (const s of bad) assert.strictEqual(guard.parseNodeId(s), null, JSON.stringify(s));
});

test('staticPath: file di dalam public dengan ekstensi terdaftar -> {file, type}', () => {
  assert.deepStrictEqual(guard.staticPath('/index.html', PUB), { file: path.join(PUB, 'index.html'), type: 'text/html; charset=utf-8' });
  assert.deepStrictEqual(guard.staticPath('/js/app.js', PUB), { file: path.join(PUB, 'js', 'app.js'), type: 'text/javascript; charset=utf-8' });
  assert.deepStrictEqual(guard.staticPath('/css/app.css', PUB), { file: path.join(PUB, 'css', 'app.css'), type: 'text/css; charset=utf-8' });
  assert.deepStrictEqual(guard.staticPath('/my%20icon.svg', PUB), { file: path.join(PUB, 'my icon.svg'), type: 'image/svg+xml' });
});

test('staticPath: traversal, byte nol, backslash, ekstensi asing, dan URL rusak -> null (404)', () => {
  const attacks = [
    '/../server/server.js',
    '/..%2fserver%2fserver.js',
    '/%2e%2e/%2e%2e/etc/passwd.js',
    '/js/../../server/guard.js',
    '/..\\server\\server.js',
    '/js%5c..%5c..%5cserver%5cserver.js',
    '/index.html%00.png',
    '/index.html\0',
    '/%E0%A4%A', // decodeURIComponent melempar
    '/C:/Windows/win.ini',
    '/index.html::$DATA', // NTFS alternate data stream
    '/x:evil.js',
    '/flows.json',
    '/.env',
    '/history.db',
    '/server.log',
    '/js/', // folder
    '/',
    '',
  ];
  for (const u of attacks) assert.strictEqual(guard.staticPath(u, PUB), null, JSON.stringify(u));
  // Garis miring ganda tetap tinggal di dalam public (bukan root disk).
  const r = guard.staticPath('//etc/passwd.js', PUB);
  assert.ok(r === null || r.file.startsWith(PUB + path.sep), 'tidak keluar dari public');
  assert.strictEqual(guard.staticPath(['/index.html'], PUB), null, 'bukan string');
});

test('SECURITY_HEADERS: CSP tanpa skrip inline, anti framing, nosniff, tanpa CORS', () => {
  const h = guard.SECURITY_HEADERS;
  const csp = Object.fromEntries(h['Content-Security-Policy'].split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  assert.deepStrictEqual(csp['default-src'], ["'self'"]);
  assert.deepStrictEqual(csp['script-src'], ["'self'"], 'tanpa unsafe-inline/unsafe-eval');
  assert.deepStrictEqual(csp['object-src'], ["'none'"]);
  assert.deepStrictEqual(csp['base-uri'], ["'none'"]);
  assert.deepStrictEqual(csp['frame-ancestors'], ["'none'"]);
  assert.deepStrictEqual(csp['connect-src'], ["'self'"]);
  assert.strictEqual(h['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(h['X-Frame-Options'], 'DENY');
  assert.strictEqual(h['Referrer-Policy'], 'no-referrer');
  assert.strictEqual(h['Cross-Origin-Resource-Policy'], 'same-origin');
  assert.ok(!Object.keys(h).some((k) => /^access-control-/i.test(k)), 'tidak ada header CORS');
});

const MB = 1024 * 1024;
const body = (chunks, headers = {}) => Object.assign(Readable.from(chunks.map((c) => Buffer.from(c))), { headers });

test('readBody: body sampai 4 MB dibaca utuh sebagai teks UTF-8', async () => {
  assert.strictEqual(await guard.readBody(body(['{"a":', '"é"}'])), '{"a":"é"}');
  const exact = 'x'.repeat(4 * MB);
  assert.strictEqual((await guard.readBody(body([exact.slice(0, MB), exact.slice(MB)]))).length, 4 * MB);
});

test('readBody: body lebih dari 4 MB ditolak 413 too_large (bertahap maupun lewat Content-Length)', async () => {
  const big = body(['x'.repeat(2 * MB), 'x'.repeat(2 * MB), 'y']);
  await assert.rejects(guard.readBody(big), (e) => e.status === 413 && e.code === 'too_large');
  // Content-Length jujur > 4 MB ditolak tanpa menunggu isi.
  const declared = body(['{}'], { 'content-length': String(4 * MB + 1) });
  await assert.rejects(guard.readBody(declared), (e) => e.status === 413 && e.code === 'too_large');
});
