const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const buildId = require('../../server/build-id');

test('build-id stabil bila file tidak berubah, dan berubah bila file mana pun di server/ atau public/ berubah', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-build-'));
  try {
    fs.mkdirSync(path.join(dir, 'public', 'js'), { recursive: true });
    const files = ['server.js', 'flows.json', path.join('public', 'index.html'), path.join('public', 'js', 'app.js')];
    for (const f of files) fs.writeFileSync(path.join(dir, f), 'x');
    const t0 = new Date('2026-01-01T00:00:00Z');
    for (const f of files) fs.utimesSync(path.join(dir, f), t0, t0);

    const a = buildId(dir);
    assert.match(a, /^[0-9a-f]{12}$/);
    assert.strictEqual(buildId(dir), a, 'tanpa perubahan, id sama');

    // File bersarang di public/ (bukan index.html) juga harus mengganti id.
    const t1 = new Date('2026-01-02T00:00:00Z');
    fs.utimesSync(path.join(dir, 'public', 'js', 'app.js'), t1, t1);
    const b = buildId(dir);
    assert.notStrictEqual(b, a, 'mtime file bersarang berubah, id berubah');

    // File baru juga mengganti id.
    fs.writeFileSync(path.join(dir, 'guard.js'), 'x');
    fs.utimesSync(path.join(dir, 'guard.js'), t0, t0);
    assert.notStrictEqual(buildId(dir), b, 'file baru, id berubah');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
