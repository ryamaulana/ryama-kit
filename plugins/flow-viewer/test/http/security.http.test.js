// PRD-8 [SEC]: server lokal menolak situs asing (Host/Origin/Content-Type), folder sembarang, dan junction. Server asli, data sementara.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 4793;
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-sec-'));
const dir = path.join(base, 'data');
const mk = (...p) => { const d = path.join(base, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
mk('data');
const projReal = mk('projReal'); // pernah berisi sesi nyata (token > 0), tanpa docs/
const projDocs = mk('projDocs'); mk('projDocs', 'docs');
const projClaude = mk('projClaude'); mk('projClaude', '.claude');
const projBare = mk('projBare'); // tercatat di riwayat, tapi bukan proyek: tanpa docs/.claude dan tanpa token
const projJ = mk('projJ'); mk('projJ', 'docs');
const outside = mk('outside');
fs.symlinkSync(outside, path.join(projJ, '.flow-viewer'), 'junction');
const projNew = mk('projNew'); mk('projNew', 'docs');

const now = Date.now();
const row = (id, project, tok) => ({ id, project, flow: 'x', title: 't' + id, prompt: 'p', started_at: now + id, updated_at: now + id, finished: 1, tokens_eq: tok, tokens_raw: tok, agents_ran: 0, files: 0, state: '{}', convo: '[]' });
const st = require('../../server/store').open(dir);
[[projReal, 5], [projDocs, 0], [projClaude, 0], [projBare, 0], [projJ, 0]].forEach(([p, t], i) => st.save(row(i + 1, p, t)));

function req(method, p, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method, headers }, (res) => {
      let t = ''; res.on('data', (c) => { t += c; }); res.on('end', () => resolve({ status: res.statusCode, text: t }));
    });
    r.on('error', reject);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
const H = `localhost:${PORT}`;
const tokens = (p, headers = {}) => req('GET', `/report/tokens.json?project=${encodeURIComponent(p)}`, { host: H, ...headers });
const current = async () => JSON.parse((await req('GET', '/history', { host: H })).text).current;
const ev = (cwd) => JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'sec-1', cwd, prompt: 'halo' });

let proc;
test.before(async () => {
  proc = spawn(process.execPath, [path.resolve(__dirname, '../../server/server.js')], { env: { ...process.env, FLOW_VIEWER_PORT: String(PORT), FLOW_VIEWER_DIR: dir }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await req('GET', '/health', { host: H }); return; } catch (_) { await new Promise((r) => setTimeout(r, 100)); } }
});
test.after(() => { proc.kill(); });

test('DNS rebinding: Host selain localhost:PORT/127.0.0.1:PORT -> 403 bad_host di laporan, riwayat, report.md, reset', async () => {
  for (const host of ['evil.com:' + PORT, 'evil.com', 'localhost:1', 'localhost.evil.com:' + PORT]) {
    for (const [m, p] of [['GET', `/report/tokens.json?project=${encodeURIComponent(projReal)}`], ['GET', '/history?all=1'], ['GET', '/report.md'], ['GET', '/state'], ['POST', '/reset']]) {
      const r = await req(m, p, { host });
      assert.strictEqual(r.status, 403, `${host} ${m} ${p}`);
      assert.strictEqual(JSON.parse(r.text).error, 'bad_host');
      assert.doesNotMatch(r.text, /projReal|t1/);
    }
  }
  for (const host of [H, `127.0.0.1:${PORT}`]) assert.strictEqual((await tokens(projReal, { host })).status, 200, host);
});

test('CSRF: POST dengan Origin bukan viewer -> 403 bad_origin, event tidak masuk', async () => {
  for (const origin of ['https://evil.com', 'null', 'http://localhost:3000']) {
    for (const p of ['/event', '/reset', '/history/delete?id=1', '/quit']) {
      const r = await req('POST', p, { host: H, origin, 'content-type': 'application/json' }, ev(projNew));
      assert.strictEqual(r.status, 403, `${origin} ${p}`);
      assert.strictEqual(JSON.parse(r.text).error, 'bad_origin');
    }
  }
  assert.notStrictEqual(await current(), projNew);
  assert.strictEqual((await req('GET', '/health', { host: H })).status, 200, 'server tidak dimatikan /quit');
});

test('POST /event: selain application/json (text/plain dari form/sendBeacon) -> 415 dan tidak diproses', async () => {
  for (const ct of ['text/plain', 'text/plain;charset=UTF-8', 'application/x-www-form-urlencoded', undefined]) {
    const h = { host: H }; if (ct) h['content-type'] = ct;
    const r = await req('POST', '/event', h, ev(projNew));
    assert.strictEqual(r.status, 415, String(ct));
    assert.strictEqual(JSON.parse(r.text).error, 'bad_content_type');
  }
  assert.notStrictEqual(await current(), projNew);
});

test('POST /event: hook asli (tanpa Origin, application/json) tetap diterima', async () => {
  const r = await req('POST', '/event', { host: `127.0.0.1:${PORT}`, 'content-type': 'application/json' }, ev(projNew));
  assert.strictEqual(r.status, 204);
  assert.strictEqual(await current(), projNew);
});

test('Folder dikenal wajib punya docs/ atau .claude/ atau pernah berisi sesi nyata', async () => {
  for (const p of [projReal, projDocs, projClaude]) assert.strictEqual((await tokens(p)).status, 200, p);
  const r = await tokens(projBare);
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(fs.readdirSync(projBare), []);
});

test('Run baru yang tersimpan langsung dikenali (cache proyek ikut diperbarui)', async () => {
  await new Promise((r) => setTimeout(r, 2000)); // persistSoon 1,5 dtk
  assert.strictEqual((await tokens(projNew)).status, 200);
});

test('Junction: .flow-viewer yang menunjuk ke luar folder proyek tidak ditulisi', async () => {
  const r = await tokens(projJ);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(fs.readdirSync(outside), []);
  assert.ok(fs.existsSync(path.join(projDocs, '.flow-viewer', 'laporan-token.md')), 'folder biasa tetap ditulisi');
});

test('POST /history/rescan: galat hanya berupa kode, tanpa pesan mentah', async () => {
  const r = await req('POST', '/history/rescan?id=99999', { host: H, 'content-type': 'application/json' });
  assert.strictEqual(r.status, 404);
  assert.deepStrictEqual(JSON.parse(r.text), { ok: false, error: 'not_found' });
});
