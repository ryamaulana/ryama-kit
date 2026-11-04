// t11 (PRD-8 [SEC], ARCHITECTURE 8.2): hal yang belum dicakup projects.http / security.http:
// Host jahat di /stream dan /projects, Sec-Fetch-Site, body 5 MB (413), transcript_path di luar ~/.claude. Server asli, data sementara.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 4795;
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-lim-'));
const mk = (...p) => { const d = path.join(base, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
const dir = mk('data');
const claudeHome = mk('claude-home'); // dipakai sebagai CLAUDE_CONFIG_DIR (akar transkrip yang sah)
const outside = mk('luar'); // di luar akar
const projA = mk('proja'), projB = mk('projb');
const H = `localhost:${PORT}`;

function req(method, p, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method, headers: { host: H, ...headers } }, (res) => {
      let t = ''; res.on('data', (c) => { t += c; }); res.on('end', () => resolve({ status: res.statusCode, text: t, json: () => JSON.parse(t) }));
    });
    r.on('error', reject);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
const get = (p, headers) => req('GET', p, { headers });
const send = (cwd, extra = {}) => req('POST', '/event', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's-' + path.basename(cwd), cwd, prompt: 'kerja ' + path.basename(cwd), ...extra }) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const transcript = (file, out) => fs.writeFileSync(file, JSON.stringify({ type: 'assistant', uuid: 'u1', message: { id: 'm1', model: 'claude-x', usage: { input_tokens: 11, output_tokens: out, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, content: [{ type: 'text', text: 'ok' }] } }) + '\n');

let proc;
test.before(async () => {
  proc = spawn(process.execPath, [path.resolve(__dirname, '../../server/server.js')], { env: { ...process.env, FLOW_VIEWER_PORT: String(PORT), FLOW_VIEWER_DIR: dir, CLAUDE_CONFIG_DIR: claudeHome }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await get('/health'); return; } catch (_) { await sleep(100); } }
});
test.after(() => { proc.kill(); });

test('Host jahat ditolak 403 bad_host juga di /stream, /projects, /detail, /health', async () => {
  for (const host of ['evil.com:' + PORT, 'evil.com', 'localhost.evil.com:' + PORT, '127.0.0.1.evil.com:' + PORT]) {
    for (const p of ['/stream', '/stream?list=1', '/projects', '/detail?id=__main', '/health']) {
      const r = await get(p, { host });
      assert.strictEqual(r.status, 403, `${host} ${p}`);
      assert.strictEqual(r.json().error, 'bad_host');
    }
  }
});

test('Sec-Fetch-Site: cross-site / same-site pada POST ditolak 403 bad_origin; hook tanpa header tetap 204', async () => {
  for (const site of ['cross-site', 'same-site']) {
    const r = await req('POST', '/event', { headers: { 'content-type': 'application/json', 'sec-fetch-site': site }, body: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'x', cwd: projA, prompt: 'palsu' }) });
    assert.strictEqual(r.status, 403, site); assert.strictEqual(r.json().error, 'bad_origin');
  }
  assert.strictEqual((await get('/state?p=proja')).status, 404, 'event palsu tidak boleh membuat proyek');
  assert.strictEqual((await send(projA)).status, 204);
});

test('body 5 MB ke /event -> 413 too_large; server tetap hidup dan tidak ada event masuk', async () => {
  const body = JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's-big', cwd: projB, prompt: 'x'.repeat(5 * 1024 * 1024) });
  assert.ok(Buffer.byteLength(body) > 5 * 1024 * 1024);
  const r = await req('POST', '/event', { headers: { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) }, body }).catch((e) => ({ status: 'galat ' + e.code, json: () => ({}) }));
  assert.strictEqual(r.status, 413);
  assert.strictEqual(r.json().error, 'too_large');
  assert.strictEqual((await get('/health')).status, 200);
  assert.strictEqual((await get('/state?p=projb')).status, 404, 'event terlalu besar tidak boleh diproses');
});

test('body tepat di bawah batas (3 MB) tetap diterima', async () => {
  const r = await send(projB, { prompt: 'y'.repeat(3 * 1024 * 1024) });
  assert.strictEqual(r.status, 204);
});

// Kontrol positif: transkrip di dalam akar sah terbaca; kontrol negatif: di luar akar diabaikan (8.2 "File lain di disk").
test('transcript_path di dalam CLAUDE_CONFIG_DIR terbaca (kontrol positif)', async () => {
  const f = path.join(claudeHome, 'sesi-dalam.jsonl'); transcript(f, 777);
  await send(projA, { session_id: 'dalam', transcript_path: f });
  await send(projA, { hook_event_name: 'Stop', session_id: 'dalam', transcript_path: f });
  let usage = null;
  for (let i = 0; i < 20 && !(usage && usage.out); i++) { await sleep(150); usage = (await get('/state?p=proja')).json().main.usage; }
  assert.ok(usage && usage.out === 777, 'token dari transkrip sah harus terbaca: ' + JSON.stringify(usage));
});

test('transcript_path di luar ~/.claude (atau bukan .jsonl, atau dengan ..) diabaikan, tokennya tidak terbaca', async () => {
  const luar = path.join(outside, 'rahasia.jsonl'); transcript(luar, 99999);
  const bukanJsonl = path.join(claudeHome, 'catatan.txt'); transcript(bukanJsonl, 88888);
  const naik = path.join(claudeHome, '..', 'luar', 'rahasia.jsonl'); // resolve -> di luar akar
  for (const [i, tp] of [luar, bukanJsonl, naik].entries()) {
    const cwd = mk('tp' + i);
    await send(cwd, { session_id: 'tp' + i, transcript_path: tp });
    await send(cwd, { hook_event_name: 'Stop', session_id: 'tp' + i, transcript_path: tp });
    await sleep(700);
    const st = (await get('/state?p=tp' + i)).json();
    assert.ok(!st.main.usage || !st.main.usage.out, `${tp} harus diabaikan, usage: ${JSON.stringify(st.main.usage)}`);
  }
});
