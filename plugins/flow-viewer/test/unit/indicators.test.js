const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '../../server/public/js/indicators.js')).href);
const NOW = 1_000_000_000_000;
const node = (o) => ({ status: 'idle', count: 0, last: '', ...o });
const S = (o = {}) => ({ prompt: 'x', startedAt: NOW - 90_000, updatedAt: NOW, main: { status: 'running' }, nodes: {}, attention: [], ...o });

test('Siapa kerja: pertanyaan terbuka menang atas status lain', async () => {
  const { indicatorsVm } = await load();
  const v = indicatorsVm(S({ nodes: { fe: node({ status: 'running', last: 'Edit a.js' }) }, attention: [{ kind: 'question', agent: '__main', text: 'Lanjut?' }] }), NOW).who;
  assert.strictEqual(v.title, 'Menunggu kamu: jawab pertanyaan');
});

test('Siapa kerja: tidak ada agent berjalan memakai teks tetap dan menyebut status sesi utama', async () => {
  const { indicatorsVm } = await load();
  const v = indicatorsVm(S({ finished: true, main: { status: 'idle' }, nodes: { fe: node({ status: 'done', count: 1 }) } }), NOW).who;
  assert.strictEqual(v.title, 'Tidak ada agent yang berjalan.');
  assert.match(v.sub, /Sesi utama: Selesai/);
  assert.deepStrictEqual(v.rows, []);
});

test('Siapa kerja: satu agent gagal menyebut agent dan putaran', async () => {
  const { indicatorsVm } = await load();
  const v = indicatorsVm(S({ nodes: { be: node({ status: 'failed', count: 2, failReason: 'tes merah' }) } }), NOW).who;
  assert.strictEqual(v.title, 'Agent be berhenti di putaran 2.');
  assert.strictEqual(v.rows[0].id, 'be');
  assert.strictEqual(v.rows[0].act, 'tes merah');
});

test('Siapa kerja: agent berjalan = nama + aktivitas terakhir, maks 2 baris lalu "+N lainnya"; yang diam disebut menitnya', async () => {
  const { indicatorsVm } = await load();
  const run = (last, extra) => node({ status: 'running', count: 1, last, lastEventAt: NOW - 30_000, ...extra });
  const v = indicatorsVm(S({ nodes: { a: run('Read x'), b: run('Edit y'), c: run('Bash z'), q: run('Grep', { quiet: true, lastEventAt: NOW - 12 * 60_000 }) } }), NOW).who;
  assert.strictEqual(v.title, '4 agent berjalan');
  assert.deepStrictEqual(v.rows.map((r) => [r.id, r.act]), [['q', 'diam 12 mnt'], ['a', 'Read x']]);
  assert.strictEqual(v.more, 2);
});

test('Progres: memakai label server; tanpa backlog dan langkah wajib = "-"', async () => {
  const { indicatorsVm } = await load();
  const a = indicatorsVm(S({ progress: { pct: 60, label: 'Backlog 12 dari 20 item' }, backlog: { total: 20 } }), NOW).prog;
  assert.deepStrictEqual([a.num, a.label, a.pct, a.hasBacklog], ['60%', 'Backlog 12 dari 20 item', 60, true]);
  assert.strictEqual(a.dur, 'Durasi 1 mnt 30 dtk');
  const b = indicatorsVm(S({ progress: { pct: null, label: '' } }), NOW).prog;
  assert.deepStrictEqual([b.num, b.pct, b.hasBacklog], ['-', null, false]);
});

test('Token: belum terbaca = "menunggu data", bukan 0', async () => {
  const { indicatorsVm } = await load();
  const t = indicatorsVm(S({ tokens: { eq: null, prevEq: null, deltaPct: null, boros: false } }), NOW).tok;
  assert.strictEqual(t.waiting, true);
  assert.strictEqual(t.num, '');
  assert.strictEqual(t.delta, null);
});

test('Token: selisih bertanda, pembanding ikut; tanpa pembanding tidak ada selisih; Boros hanya dari server', async () => {
  const { indicatorsVm } = await load();
  const a = indicatorsVm(S({ tokens: { eq: 184_200, prevEq: 164_000, deltaPct: 12, boros: false } }), NOW).tok;
  assert.deepStrictEqual([a.num, a.delta.text, a.delta.prev, a.boros], ['184 rb', '+12% dari run sebelumnya', '(164 rb)', false]);
  const b = indicatorsVm(S({ tokens: { eq: 184_200, prevEq: null, deltaPct: null, boros: false } }), NOW).tok;
  assert.strictEqual(b.delta, null);
  const c = indicatorsVm(S({ tokens: { eq: 300_000, prevEq: 100_000, deltaPct: 200, boros: true } }), NOW).tok;
  assert.strictEqual(c.boros, true);
  const d = indicatorsVm(S({ tokens: { eq: 90_000, prevEq: 100_000, deltaPct: -10, boros: false } }), NOW).tok;
  assert.strictEqual(d.delta.text, '-10% dari run sebelumnya');
});
