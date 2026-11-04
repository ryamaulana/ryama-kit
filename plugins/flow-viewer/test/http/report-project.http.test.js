// PRD-8, F12-2: laporan token per proyek lewat HTTP. Server asli, data sementara.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 4792;
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-http-'));
const dir = path.join(base, 'data');
const projA = path.join(base, 'projA');
const projB = path.join(base, 'projB');
const unknown = path.join(base, 'unknown');
[dir, projA, projB, unknown].forEach((d) => fs.mkdirSync(d, { recursive: true }));
const now = Date.now();
const run = (id, project, title) => ({ id, project, flow: 'x', title, prompt: 'p', started_at: now + id, updated_at: now + id, finished: 1, tokens_eq: 1, tokens_raw: 1, agents_ran: 0, files: 0, state: '{}', convo: '[]' });
const st = require('../../server/store').open(dir);
st.save(run(1, projA, 'run-milik-A'));
st.save(run(2, projB, 'run-milik-B'));

let proc;
test.before(async () => {
  proc = spawn(process.execPath, [path.resolve(__dirname, '../../server/server.js')], { env: { ...process.env, FLOW_VIEWER_PORT: String(PORT), FLOW_VIEWER_DIR: dir }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${PORT}/report.md`); return; } catch (_) { await new Promise((r) => setTimeout(r, 100)); } }
});
test.after(() => { proc.kill(); });

const get = (p, ext = 'json') => fetch(`http://localhost:${PORT}/report/tokens.${ext}` + (p === undefined ? '' : `?project=${encodeURIComponent(p)}`));

test('PRD-8 F12-2: project tak dikenal, path berbahaya, atau kosong -> 400 dan tidak ada file ditulis', async () => {
  const bad = [unknown, '../../x', '..\\..\\x', path.join(projA, '..', 'unknown'), '', undefined];
  for (const p of bad) for (const ext of ['md', 'json']) {
    const r = await get(p, ext);
    assert.strictEqual(r.status, 400, `${ext} ${String(p)}`);
  }
  assert.deepStrictEqual(fs.readdirSync(unknown), []);
  assert.deepStrictEqual(fs.readdirSync(projA), []);
  assert.deepStrictEqual(fs.readdirSync(projB), []);
});

test('PRD-8 F12-2: project terdaftar -> 200 dan hanya memuat run proyek itu', async () => {
  const r = await get(projA);
  assert.strictEqual(r.status, 200);
  const R = await r.json();
  assert.strictEqual(R.project, projA);
  assert.deepStrictEqual(R.runs.map((x) => x.title), ['run-milik-A']);
  const md = await (await get(projB, 'md')).text();
  assert.match(md, /run-milik-B/);
  assert.doesNotMatch(md, /run-milik-A/);
});
