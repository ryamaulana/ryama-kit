// t10b (F1-1, F1-3, PRD-8): server melayani banyak proyek lewat ?p=, /projects, /stream, batas koneksi, rotasi log. Server asli, data sementara.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 4794;
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-multi-'));
const dir = path.join(base, 'data');
const mk = (...p) => { const d = path.join(base, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
mk('data');
const alfa = mk('alfa'), beta = mk('beta'), gama = mk('gama', 'docs') && mk('gama'), lama = mk('lama', 'docs') && mk('lama');
const H = `localhost:${PORT}`;

const now = Date.now();
const row = (id, eq) => ({ id, project: lama, flow: 'x', title: 'lama-' + id, prompt: 'p', started_at: now - 1e7 + id, updated_at: now - 1e7 + id, finished: 1, tokens_eq: eq, tokens_raw: eq, agents_ran: 0, files: 0, state: '{"nodes":{},"main":{},"finished":true,"flow":"x"}', convo: '[]' });
const st = require('../../server/store').open(dir);
st.save(row(1, 100)); st.save(row(2, 200));

function req(method, p, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method, headers: { host: H, ...headers } }, (res) => {
      let t = ''; res.on('data', (c) => { t += c; }); res.on('end', () => resolve({ status: res.statusCode, text: t, headers: res.headers, json: () => JSON.parse(t) }));
    });
    r.on('error', reject);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
const get = (p) => req('GET', p);
const send = (cwd, extra = {}) => req('POST', '/event', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's-' + path.basename(cwd), cwd, prompt: 'kerja ' + path.basename(cwd), ...extra }) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pembaca SSE: kumpulkan pesan {event, data} dari satu koneksi.
function sse(p, headers = {}) {
  return new Promise((resolve, reject) => {
    const msgs = []; let buf = '';
    const r = http.get({ host: '127.0.0.1', port: PORT, path: p, headers: { host: H, ...headers } }, (res) => {
      const c = { status: res.statusCode, msgs, close: () => r.destroy(), headers: res.headers };
      if (res.statusCode !== 200) { let t = ''; res.on('data', (d) => { t += d; }); res.on('end', () => resolve({ ...c, text: t })); return; }
      res.setEncoding('utf8');
      res.on('data', (d) => {
        buf += d;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = /^event: (.*)$/m.exec(block), da = /^data: (.*)$/m.exec(block);
          if (da) msgs.push({ event: ev ? ev[1] : 'message', data: JSON.parse(da[1]) });
        }
      });
      resolve(c);
    });
    r.on('error', (e) => { if (e.code !== 'ECONNRESET') reject(e); });
  });
}
const snaps = (c) => c.msgs.filter((m) => m.event === 'message').map((m) => m.data);

let proc;
test.before(async () => {
  proc = spawn(process.execPath, [path.resolve(__dirname, '../../server/server.js')], { env: { ...process.env, FLOW_VIEWER_PORT: String(PORT), FLOW_VIEWER_DIR: dir, FLOW_VIEWER_LOG_MAX: '20000' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await get('/health'); return; } catch (_) { await sleep(100); } }
});
test.after(() => { proc.kill(); });

test('/health: ok, build, version; header keamanan terpasang', async () => {
  const r = await get('/health');
  const j = r.json();
  assert.strictEqual(j.ok, true);
  assert.match(j.build, /\S/);
  assert.match(j.version, /^\d+\.\d+\.\d+/);
  assert.strictEqual(r.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(r.headers['referrer-policy'], 'no-referrer');
});

test('F1-1: dua proyek terpisah; ?p= memilih proyek, tanpa ?p= = terbaru; salah bentuk 400, tak dikenal 404', async () => {
  assert.strictEqual((await send(alfa)).status, 204);
  await sleep(20);
  assert.strictEqual((await send(beta)).status, 204);
  const a = (await get('/state?p=alfa')).json(), b = (await get('/state?p=beta')).json(), latest = (await get('/state')).json();
  assert.strictEqual(a.project.id, 'alfa'); assert.strictEqual(a.prompt, 'kerja alfa'); assert.strictEqual(a.live, true);
  assert.strictEqual(b.project.id, 'beta'); assert.strictEqual(b.prompt, 'kerja beta');
  assert.strictEqual(latest.project.id, 'beta');
  assert.ok(!JSON.stringify(a).includes('beta') && !JSON.stringify(b).includes('alfa'));
  for (const bad of ['A B', '../x', '.x', 'x'.repeat(70)]) {
    const r = await get('/state?p=' + encodeURIComponent(bad));
    assert.strictEqual(r.status, 400, bad); assert.strictEqual(r.json().error, 'bad_project');
  }
  const nf = await get('/state?p=tidakada');
  assert.strictEqual(nf.status, 404); assert.strictEqual(nf.json().error, 'project_not_found');
  const old = (await get('/state?p=lama')).json(); // proyek dari Riwayat
  assert.strictEqual(old.live, false); assert.strictEqual(old.project.id, 'lama');
});

test('?p= di semua endpoint: detail, report, reset, history hanya menyentuh proyek itu', async () => {
  const d = (await get('/detail?p=alfa&id=__convo')).json();
  assert.ok(JSON.stringify(d).includes('kerja alfa') && !JSON.stringify(d).includes('kerja beta'));
  assert.strictEqual((await get('/detail?p=alfa&id=..%2Fx')).status, 400);
  assert.strictEqual((await get('/detail?p=alfa&id=..%2Fx')).json().error, 'bad_id');
  assert.strictEqual((await get('/detail?p=zzz&id=__main')).status, 404);
  const md = (await get('/report.md?p=beta')).text;
  assert.match(md, /kerja beta/); assert.doesNotMatch(md, /kerja alfa/);
  assert.strictEqual((await get('/report.md?p=zzz')).status, 404);
  assert.strictEqual((await req('POST', '/reset?p=beta')).status, 204);
  assert.strictEqual((await get('/state?p=beta')).json().prompt || '', '');
  assert.strictEqual((await get('/state?p=alfa')).json().prompt, 'kerja alfa');
  assert.strictEqual((await req('POST', '/reset?p=Bad!')).status, 400);
  assert.strictEqual((await req('POST', '/reset?p=zzz')).status, 404);
  assert.strictEqual((await send(beta)).status, 204);
});

test('F1-3 /projects: terbaru, butuh input di atas, agregat attention, inactive dari Riwayat', async () => {
  await send(alfa, { hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_use_id: 'tu1', tool_input: { questions: [{ question: 'Pilih?', options: [{ label: 'A' }, { label: 'B' }] }] } });
  await send(beta, { prompt: 'beta lagi' });
  const j = (await get('/projects')).json();
  assert.strictEqual(j.latest, 'beta');
  assert.deepStrictEqual(j.projects.map((p) => p.id), ['alfa', 'beta']); // alfa butuh input walau beta lebih baru
  const a = j.projects[0];
  assert.deepStrictEqual(Object.keys(a).sort(), ['active', 'attention', 'id', 'lastEventAt', 'name', 'path', 'phase', 'progress', 'running', 'shortPath', 'tokensEq']);
  assert.strictEqual(a.path, alfa); assert.strictEqual(a.active, true);
  assert.deepStrictEqual({ input: a.attention.input, failed: a.attention.failed, done: a.attention.done }, { input: 1, failed: 0, done: 0 });
  assert.strictEqual(a.attention.items[0].text, 'Pilih?'); assert.strictEqual(a.attention.items[0].kind, 'question');
  assert.deepStrictEqual(Object.keys(a.attention.items[0]).sort(), ['key', 'kind', 'text']);
  assert.deepStrictEqual(j.inactive.map((p) => p.id), ['lama']);
  assert.deepStrictEqual(Object.keys(j.inactive[0]).sort(), ['id', 'lastEventAt', 'name', 'shortPath']);
});

test('/stream?p=: snapshot awal + event projects; pembaruan dibatasi ~250 ms; proyek lain tidak ikut', async () => {
  await sleep(400); // siaran tertunda dari tes sebelumnya
  const c = await sse('/stream?p=alfa');
  await sleep(150);
  assert.strictEqual(snaps(c).length, 1); assert.strictEqual(snaps(c)[0].project.id, 'alfa');
  assert.ok(c.msgs.some((m) => m.event === 'projects' && m.data.latest));
  await sleep(300); // lewati jendela throttle sebelumnya
  const n0 = c.msgs.length;
  await send(beta, { prompt: 'untuk beta saja' });
  await sleep(400);
  assert.strictEqual(snaps(c).length, 1, 'event beta tidak boleh sampai ke penonton alfa');
  for (let i = 0; i < 10; i++) await send(alfa, { prompt: 'alfa ' + i });
  await sleep(120);
  assert.ok(snaps(c).length <= 2, 'burst 10 event -> paling banyak 1 siaran dalam 250 ms pertama, bukan 10: ' + snaps(c).length);
  await sleep(500);
  const last = snaps(c).pop();
  assert.strictEqual(last.prompt, 'alfa 9'); // trailing: keadaan terakhir sampai
  assert.ok(c.msgs.length > n0);
  c.close();
});

test('/stream tanpa ?p= mengikuti proyek terbaru; ?list=1 hanya event projects; p belum ada menunggu', async () => {
  await sleep(400);
  const legacy = await sse('/stream');
  const list = await sse('/stream?list=1');
  const wait = await sse('/stream?p=baru');
  await sleep(150);
  assert.strictEqual(snaps(legacy).pop().project.id, 'alfa'); // alfa terakhir kena event
  assert.deepStrictEqual(snaps(list), []);
  assert.ok(list.msgs.some((m) => m.event === 'projects'));
  assert.deepStrictEqual(snaps(wait), []);
  await send(beta, { prompt: 'beta menang' });
  await sleep(500);
  assert.strictEqual(snaps(legacy).pop().project.id, 'beta');
  const baru = mk('baru');
  await send(baru);
  await sleep(500);
  assert.strictEqual(snaps(wait).pop().project.id, 'baru');
  await sleep(1000); // event projects: maks 1/dtk
  assert.ok(list.msgs.filter((m) => m.event === 'projects').pop().data.projects.some((p) => p.id === 'baru'));
  assert.strictEqual((await sse('/stream?p=Bad!')).status, 400);
  [legacy, list, wait].forEach((c) => c.close());
});

test('maks 50 koneksi SSE: ke-51 ditolak 503 too_many_streams, dan slot kembali setelah ditutup', async () => {
  await sleep(300); // penutupan koneksi dari tes sebelumnya diproses server
  const open = [];
  for (let i = 0; i < 50; i++) open.push(await sse('/stream?list=1'));
  assert.ok(open.every((c) => c.status === 200));
  const x = await sse('/stream?list=1');
  assert.strictEqual(x.status, 503);
  assert.strictEqual(JSON.parse(x.text).error, 'too_many_streams');
  open.forEach((c) => c.close());
  await sleep(200);
  const y = await sse('/stream?list=1');
  assert.strictEqual(y.status, 200); y.close();
});

test('/history: groups, liveIds, deltaPct/boros per baris; hapus menolak run live dan membuang pembanding', async () => {
  const h = (await get('/history?all=1')).json();
  const g = h.groups.find((x) => x.projectId === 'lama');
  assert.deepStrictEqual(g, { projectId: 'lama', name: 'lama', count: 2 });
  const r2 = h.rows.find((r) => r.id === 2), r1 = h.rows.find((r) => r.id === 1);
  assert.strictEqual(r2.projectId, 'lama'); assert.strictEqual(r2.deltaPct, 100); assert.strictEqual(r2.boros, true);
  assert.strictEqual(r1.deltaPct, null); assert.strictEqual(r1.boros, false);
  const own = (await get('/history?p=alfa')).json();
  assert.ok(own.liveIds.includes(own.liveId) && own.liveIds.length >= 2);
  assert.ok(own.rows.every((r) => r.projectId === 'alfa'));
  const live = await req('POST', '/history/delete?id=' + own.liveId);
  assert.strictEqual(live.status, 409); assert.strictEqual(live.json().error, 'run_live');
  assert.strictEqual((await req('POST', '/history/delete?id=abc')).status, 400);
  assert.strictEqual((await req('POST', '/history/delete?id=777')).status, 404);
  assert.strictEqual((await req('POST', '/history/delete?id=1')).status, 204);
  assert.strictEqual((await req('POST', '/history/delete?id=1')).status, 404);
  const after = (await get('/history?all=1')).json();
  assert.strictEqual(after.rows.find((r) => r.id === 2).deltaPct, null);
  assert.strictEqual(after.groups.find((x) => x.projectId === 'lama').count, 1);
});

test('laporan token: ?p= wajib; no_runs bila folder dikenal tapi tanpa run', async () => {
  assert.strictEqual((await get('/report/tokens.json')).json().error, 'bad_project');
  const r = await get('/report/tokens.json?p=lama');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json().project, { id: 'lama', name: 'lama' });
  await send(gama, { hook_event_name: 'SessionStart' }); // run kosong, tidak disimpan
  const n = await get('/report/tokens.json?p=gama');
  assert.strictEqual(n.status, 404); assert.strictEqual(n.json().error, 'no_runs');
});

test('POST /event: JSON rusak atau bukan objek -> 400 bad_json', async () => {
  for (const body of ['{oops', '[1]', '"x"', 'null']) {
    const r = await req('POST', '/event', { headers: { 'content-type': 'application/json' }, body });
    assert.strictEqual(r.status, 400, body); assert.strictEqual(r.json().error, 'bad_json');
  }
});

test('file statis: / dilayani; path traversal 404', async () => {
  const r = await get('/');
  assert.strictEqual(r.status, 200); assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.headers['content-security-policy'], /script-src 'self'/);
  for (const p of ['/%2e%2e/server/server.js', '/js/..%2f..%2fserver.js', '/..\\server\\server.js', '/server.js', '/js']) assert.strictEqual((await get(p)).status, 404, p);
});

test('events.jsonl dirotasi saat melewati batas (uji: 20 KB)', async () => {
  const big = 'x'.repeat(500);
  for (let i = 0; i < 80; i++) await send(alfa, { prompt: big });
  await sleep(300);
  const cur = path.join(dir, 'events.jsonl'), old = path.join(dir, 'events.1.jsonl');
  assert.ok(fs.existsSync(old), 'events.1.jsonl harus ada');
  assert.ok(fs.statSync(cur).size < 21000, 'events.jsonl tidak boleh melewati batas: ' + fs.statSync(cur).size);
});
