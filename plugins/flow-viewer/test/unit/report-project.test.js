const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 4791;
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-rp-'));
const dir = path.join(base, 'data');
const projA = path.join(base, 'projA');
const projB = path.join(base, 'projB'); // folder ada, tapi tidak pernah dipakai run
const outside = path.join(base, 'outside');
[dir, projA, projB, outside].forEach((d) => fs.mkdirSync(d, { recursive: true }));
const now = Date.now();
require('../../server/store').open(dir).save({ id: 1, project: projA, flow: 'x', title: 't', prompt: 'p', started_at: now, updated_at: now, finished: 1, tokens_eq: 1, tokens_raw: 1, agents_ran: 0, files: 0, state: '{}', convo: '[]' });

let proc;
test.before(async () => {
  proc = spawn(process.execPath, [path.resolve(__dirname, '../../server/server.js')], { env: { ...process.env, FLOW_VIEWER_PORT: String(PORT), FLOW_VIEWER_DIR: dir }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${PORT}/report.md`); return; } catch (_) { await new Promise((r) => setTimeout(r, 100)); } }
});
test.after(() => { proc.kill(); });

const get = (p, ext = 'md') => fetch(`http://localhost:${PORT}/report/tokens.${ext}?p=${encodeURIComponent(p)}`);

test('p dari luar daftar: 400/404 pesan biasa, tidak ada file ditulis', async () => {
  const bad = ['../../x', '..\\..\\x', outside, projB, '', path.join(projA, '..', 'outside')];
  for (const p of bad) for (const ext of ['md', 'json']) {
    const r = await get(p, ext);
    assert.strictEqual(r.status, 400, `${ext} ${p}`);
    assert.doesNotMatch(await r.text(), /at .*\.js|Error:/);
  }
  const r = await fetch(`http://localhost:${PORT}/report/tokens.md`); // tanpa parameter: tidak jatuh ke folder kerja terakhir
  assert.strictEqual(r.status, 400);
  for (const d of [outside, projB]) assert.deepStrictEqual(fs.readdirSync(d), [], d);
});

test('proyek terdaftar: 200 dan laporan ditulis hanya di foldernya', async () => {
  const r = await get('proja');
  assert.strictEqual(r.status, 200);
  assert.ok(fs.existsSync(path.join(projA, '.flow-viewer', 'laporan-token.md')));
  assert.deepStrictEqual(fs.readdirSync(projB), []);
});
