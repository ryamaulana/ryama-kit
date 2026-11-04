const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { createRegistry } = require('../../server/projects');
const { catalogFromFlows } = require('../../server/run');

const FLOWS = { free: { title: 'Overview', nodes: [{ id: 'be', col: 0, row: 0, role: 'backend' }], edges: [] } };
const catalog = { catalogFor: () => catalogFromFlows(FLOWS, { be: { model: 'sonnet', description: 'x', tools: 'Bash', skills: [] } }) };
const ROOT = process.platform === 'win32' ? 'D:\\ws' : '/ws';
const dir = (...p) => path.join(ROOT, ...p);
const H6 = 6 * 3600 * 1000;

let T;
function setup(extra = {}) {
  T = 1_700_000_000_000;
  const saved = [];
  const history = [];
  const store = { save: (r) => saved.push(r), projects: () => history.map((h) => ({ project: h, count: 1, last_at: 1 })) };
  const reg = createRegistry({ store, catalog, now: () => (T += 10), ...extra });
  return { reg, saved, history };
}
const prompt = (cwd, session_id, text) => ({ hook_event_name: 'UserPromptSubmit', cwd, session_id, prompt: text });

test('F1-1: dua sesi di folder beda bergantian tetap terpisah', () => {
  const { reg } = setup();
  reg.ingest(prompt(dir('alfa'), 's1', 'untuk alfa'));
  reg.ingest(prompt(dir('beta'), 's2', 'untuk beta'));
  reg.ingest({ hook_event_name: 'UserPromptSubmit', cwd: dir('alfa'), session_id: 's1', prompt: 'alfa lagi' });
  reg.ingest(prompt(dir('beta'), 's2', 'beta lagi'));
  const a = reg.resolve('alfa'), b = reg.resolve('beta');
  assert.notStrictEqual(a, b);
  assert.deepStrictEqual(a.run.snapshot().prompt, 'alfa lagi');
  assert.deepStrictEqual(b.run.snapshot().prompt, 'beta lagi');
  assert.ok(!JSON.stringify(a.run.snapshot()).includes('beta'));
  assert.ok(!JSON.stringify(b.run.snapshot()).includes('alfa'));
  assert.deepStrictEqual(reg.list().map((p) => p.id).sort(), ['alfa', 'beta']);
});

test('ikatan sesi: cwd pindah ke subfolder di tengah sesi tetap proyek yang sama', () => {
  const { reg } = setup();
  reg.ingest(prompt(dir('flow-viewer'), 's1', 'mulai'));
  reg.ingest(prompt(dir('flow-viewer', 'docs', 'mockups'), 's1', 'pindah folder'));
  assert.strictEqual(reg.list().length, 1);
  assert.strictEqual(reg.resolve('flow-viewer').run.snapshot().prompt, 'pindah folder');
});

test('sesi belum terikat dengan cwd di subfolder proyek dikenal ikut proyek induk', () => {
  const { reg } = setup();
  reg.ingest(prompt(dir('flow-viewer'), 's1', 'a'));
  const p = reg.ingest(prompt(dir('flow-viewer', 'docs', 'mockups'), 's9', 'dari subfolder'));
  assert.strictEqual(p.key, dir('flow-viewer'));
  assert.strictEqual(reg.list().length, 1);
});

test('sesi belum terikat: induk yang hanya ada di riwayat juga dikenali (setelah restart)', () => {
  const { reg, history } = setup();
  history.push(dir('flow-viewer'));
  const p = reg.ingest(prompt(dir('flow-viewer', 'docs'), 's1', 'x'));
  assert.strictEqual(p.key, dir('flow-viewer'));
});

test('folder yang tidak berada di dalam proyek dikenal menjadi proyek baru, termasuk nama berawalan sama', () => {
  const { reg } = setup();
  reg.ingest(prompt(dir('app'), 's1', 'a'));
  const p = reg.ingest(prompt(dir('app-lama'), 's2', 'b'));
  assert.strictEqual(p.key, dir('app-lama'));
  assert.strictEqual(reg.list().length, 2);
});

test('kunci: path dinormalkan (pemisah akhir dibuang, ./.. diselesaikan)', () => {
  const { reg } = setup();
  const p = reg.ingest(prompt(dir('alfa') + path.sep, 's1', 'a'));
  const q = reg.ingest(prompt(dir('alfa', 'x', '..'), 's2', 'b'));
  assert.strictEqual(p.key, dir('alfa'));
  assert.strictEqual(q, p);
  if (process.platform === 'win32') {
    const r = reg.ingest(prompt('d:\\ws\\gamma', 's3', 'c'));
    assert.strictEqual(r.key, 'D:\\ws\\gamma');
  }
});

test('tanpa cwd: ikuti ikatan sesi, atau proyek terbaru; tanpa proyek sama sekali = (tanpa folder)', () => {
  const { reg } = setup();
  const none = reg.ingest(prompt(undefined, 's0', 'tanpa folder'));
  assert.strictEqual(none.name, '(tanpa folder)');
  reg.ingest(prompt(dir('alfa'), 's1', 'a'));
  reg.ingest(prompt(dir('beta'), 's2', 'b'));
  const p = reg.ingest({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'tanpa cwd' }); // terikat ke alfa
  assert.strictEqual(p.key, dir('alfa'));
  const q = reg.ingest({ hook_event_name: 'UserPromptSubmit', session_id: 's7', prompt: 'baru tanpa cwd' }); // alfa baru saja aktif
  assert.strictEqual(q.key, dir('alfa'));
  assert.strictEqual(reg.latest().key, dir('alfa'));
  reg.ingest(prompt(dir('beta'), 's2', 'b2'));
  assert.strictEqual(reg.ingest({ hook_event_name: 'UserPromptSubmit', prompt: 'x' }).key, dir('beta'));
});

test('slug id: nama folder; kembar memakai slug-hash6 untuk keduanya; resolve menerima bentuk valid saja', () => {
  const { reg } = setup();
  const a = reg.ingest(prompt(path.join(ROOT, 'x', 'app'), 's1', 'a'));
  assert.strictEqual(a.id, 'app');
  const b = reg.ingest(prompt(path.join(ROOT, 'y', 'app'), 's2', 'b'));
  assert.match(a.id, /^app-[0-9a-f]{6}$/);
  assert.match(b.id, /^app-[0-9a-f]{6}$/);
  assert.notStrictEqual(a.id, b.id);
  assert.strictEqual(reg.resolve(a.id), a);
  assert.strictEqual(reg.resolve(b.id), b);
  assert.strictEqual(reg.resolve('app'), null); // ambigu
  assert.strictEqual(reg.resolve('tidak-ada'), null);
  assert.strictEqual(reg.resolve('../etc'), null);
  // slug dibersihkan ke a-z0-9._- dan maks 48
  const c = reg.ingest(prompt(dir('Proyek Saya (v2)'), 's3', 'c'));
  assert.match(c.id, /^[a-z0-9][a-z0-9._-]{0,47}$/);
  const d = reg.ingest(prompt(dir('z'.repeat(100)), 's4', 'd'));
  assert.strictEqual(d.id.length, 48);
});

test('resolve juga mencari riwayat; kembaran riwayat memicu bentuk ber-hash untuk proyek hidup', () => {
  const { reg, history } = setup();
  history.push(dir('lama', 'cetak'));
  const h = reg.resolve('cetak');
  assert.strictEqual(h.key, dir('lama', 'cetak'));
  assert.strictEqual(h.run, null);
  const live = reg.ingest(prompt(dir('baru', 'cetak'), 's1', 'a'));
  assert.match(live.id, /^cetak-[0-9a-f]{6}$/);
  assert.strictEqual(reg.resolve(live.id), live);
  assert.strictEqual(reg.resolve('cetak'), null);
  const hist = reg.resolve(`cetak-${require('crypto').createHash('sha1').update(dir('lama', 'cetak')).digest('hex').slice(0, 6)}`);
  assert.strictEqual(hist.key, dir('lama', 'cetak'));
});

test('aktif 6 jam: list/latest hanya yang aktif; resolve tetap menemukan yang tidak aktif', () => {
  const { reg } = setup();
  reg.ingest(prompt(dir('alfa'), 's1', 'a'));
  T += H6 - 1000;
  assert.strictEqual(reg.list().length, 1);
  T += 2000;
  assert.strictEqual(reg.list().length, 0);
  assert.strictEqual(reg.latest(), null);
  assert.ok(reg.resolve('alfa'));
  reg.ingest(prompt(dir('beta'), 's2', 'b'));
  assert.deepStrictEqual(reg.list().map((p) => p.id), ['beta']);
});

test('sweep: proyek tidak aktif tanpa penonton dibuang dan run-nya disimpan dulu', () => {
  const watched = new Set();
  const { reg, saved } = setup({ watched: (p) => watched.has(p.key) });
  reg.ingest(prompt(dir('alfa'), 's1', 'a'));
  reg.ingest(prompt(dir('beta'), 's2', 'b'));
  watched.add(dir('beta'));
  T += H6 + 1000;
  reg.sweep();
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].project, dir('alfa'));
  assert.ok(reg.resolve('beta').run, 'ditonton: tetap di memori');
  assert.strictEqual(reg.resolve('alfa').run, null, 'keluar dari memori, tetap bisa dibuka lewat riwayat');
  assert.deepStrictEqual(reg.list().map((p) => p.id), []);
});

test('eviksi: maks 20 proyek di memori, yang terlama keluar dan runnya disimpan', () => {
  const { reg, saved } = setup();
  for (let i = 0; i < 20; i++) reg.ingest(prompt(dir('p' + i), 's' + i, 'x'));
  assert.strictEqual(saved.length, 0);
  reg.ingest(prompt(dir('p0'), 's0', 'p0 aktif lagi')); // p0 jadi terbaru, p1 terlama
  reg.ingest(prompt(dir('p20'), 's20', 'x'));
  assert.strictEqual(reg.list().length, 20);
  assert.deepStrictEqual(saved.map((r) => r.project), [dir('p1')]);
  assert.ok(reg.list().some((p) => p.key === dir('p0')));
  // ikatan sesi proyek yang dibuang ikut hilang: s1 tanpa cwd kini ikut proyek terbaru, bukan p1
  assert.strictEqual(reg.ingest({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'y' }).key, dir('p20'));
});

test('run baru per sesi: sesi lain di folder yang sama memulai run baru dan run lama disimpan', () => {
  const { reg, saved } = setup();
  reg.ingest(prompt(dir('alfa'), 's1', 'sesi satu'));
  reg.ingest({ hook_event_name: 'SessionStart', cwd: dir('alfa'), session_id: 's2' });
  const p = reg.ingest(prompt(dir('alfa'), 's2', 'sesi dua'));
  assert.strictEqual(reg.list().length, 1);
  assert.strictEqual(p.run.snapshot().prompt, 'sesi dua');
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].prompt, 'sesi satu');
});
