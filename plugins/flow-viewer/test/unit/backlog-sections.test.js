const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { summarize } = require('../../server/backlog-summary');

const FIX = path.join(__dirname, '..', 'fixtures', 'backlog-proyek');

function tmpProject(t, db) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-bs-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'backlog.json'), typeof db === 'string' ? db : JSON.stringify(db));
  return dir;
}
const it = (id, over) => ({ id, title: id.toUpperCase(), status: 'todo', needs: [], ...over });
const brief = (s) => s.sections.map((x) => `${x.name}|${x.state}|${x.done}/${x.total}`);

// Nilai harapan: dihitung tangan dari aturan PRD F11 untuk fixture (slice: fondasi a1 a2; detail-node a3..a7;
// pemberitahuan a8; tema d1 d4; tanpa slice d2 d3 d5).
test('fixture: bagian urut keadaan, kepala bagian, baris jawaban, persen tetap indikator (b)', () => {
  const b = summarize(FIX);
  assert.deepStrictEqual(brief(b), [
    'Tema|decision|1/2', // d1 keputusan siap
    'Pemberitahuan|stuck|0/1', // a8 gagal
    'Detail node|running|1/3', // a3 selesai, a4 siap, a5 berjalan; a6 diparkir dan a7 ditolak tidak dihitung
    'Tanpa bagian|running|0/2', // d3 berjalan, d2 menunggu
    'Fondasi|done|2/2'
  ]);
  assert.deepStrictEqual(b.sections.map((s) => s.stateLabel),
    ['Butuh keputusan', 'Macet', 'Berjalan', 'Berjalan', 'Selesai']);
  assert.strictEqual(b.sliced, true);
  assert.strictEqual(b.pct, 45);
  assert.strictEqual(b.answer.macet, 1);
  assert.strictEqual(b.answer.decisions, 1);
  assert.deepStrictEqual(b.answer.next, { id: 'a4', title: 'Siap tanpa ukuran (default m)' });
  assert.strictEqual(b.answer.text, '1 bagian macet · 1 keputusan menunggu kamu · Berikutnya: Siap tanpa ukuran (default m)');
});

test('fixture: urutan item di bagian, konteks satu baris, keputusan selesai tidak berlabel keputusan', () => {
  const b = summarize(FIX);
  const sec = (n) => b.sections.find((s) => s.name === n);
  const rows = (n) => sec(n).items.map((i) => `${i.id}:${i.state}`);
  assert.deepStrictEqual(rows('Tema'), ['d1:decision', 'd4:done']);
  assert.deepStrictEqual(rows('Detail node'), ['a5:running', 'a4:ready', 'a3:done']);
  assert.deepStrictEqual(rows('Tanpa bagian'), ['d3:decision', 'd2:waiting']);
  const d = (id) => b.sections.flatMap((s) => s.items).find((i) => i.id === id);
  assert.strictEqual(d('d1').context, 'Pakai tema gelap default?');
  assert.strictEqual(d('d4').stateLabel, 'Selesai');
  assert.strictEqual(d('d4').context, '', 'keputusan selesai: tanpa pertanyaan');
  assert.strictEqual(d('a8').context, 'port bentrok');
  assert.strictEqual(d('d2').context, 'Menunggu: Siap tanpa ukuran (default m)');
  assert.deepStrictEqual(d('d2').waitingFor, [{ id: 'a4', title: 'Siap tanpa ukuran (default m)' }]);
  assert.strictEqual(d('a3').typeLabel, 'Fitur', 'jenis tak dikenal: huruf besar biasa');
  assert.deepStrictEqual(b.sections.flatMap((s) => s.items).map((i) => i.id).sort(),
    ['a1', 'a2', 'a3', 'a4', 'a5', 'a8', 'd1', 'd2', 'd3', 'd4'], 'diparkir dan ditolak tidak di bagian');
});

test('grup Diparkir memuat diparkir dan ditolak, di luar persen dan hitungan bagian', () => {
  const b = summarize(FIX);
  assert.deepStrictEqual(b.parkedGroup, [
    { id: 'a6', title: 'Diparkir besar', label: 'Diparkir' },
    { id: 'a7', title: 'Ditolak sedang', label: 'Ditolak' },
    { id: 'd5', title: 'Keputusan diparkir', label: 'Diparkir' }
  ]);
  assert.strictEqual(b.total, 10);
});

test('keadaan bagian: Belum mulai, Macet karena dependensi, Macet karena gagal, Selesai berisi keputusan selesai', (t) => {
  const b = summarize(tmpProject(t, { items: [
    it('n1', { slice: 'baru' }), it('n2', { slice: 'baru', needs: ['n1'] }),
    it('s1', { slice: 'mandek', needs: ['hantu'] }),
    it('g1', { slice: 'gagal', status: 'failed', lastFailure: 'x' }), it('g2', { slice: 'gagal', needs: ['g1'] }),
    it('k1', { slice: 'beres', status: 'done', checkpoint: 'Sudah?' })
  ] }));
  assert.deepStrictEqual(brief(b), [
    'Mandek|stuck|0/1', 'Gagal|stuck|0/2', 'Baru|notstarted|0/2', 'Beres|done|1/1']);
  assert.strictEqual(b.sections[0].items[0].context, 'Menunggu: hantu', 'id yang tak ada tampil apa adanya');
  assert.strictEqual(b.answer.text, '2 bagian macet · Berikutnya: N1', 'keputusan nol tidak ditulis');
  assert.strictEqual(b.answer.decisions, 0, 'keputusan selesai tidak dihitung');
});

test('baris jawaban: tanpa item siap, dan menunggu maksimal dua judul + sisa', (t) => {
  const b = summarize(tmpProject(t, { items: [
    it('a', { slice: 'x', status: 'running' }),
    it('w', { slice: 'x', needs: ['a', 'p', 'q'] }),
    it('p', { slice: 'x', status: 'running' }), it('q', { slice: 'x', status: 'running' })
  ] }));
  assert.strictEqual(b.answer.text, 'Tidak ada item siap');
  assert.strictEqual(b.answer.next, null);
  const w = b.sections[0].items.find((i) => i.id === 'w');
  assert.strictEqual(w.context, 'Menunggu: A, P +1');
  assert.strictEqual(w.waitingMore, 1);
  assert.strictEqual(w.waitingFor.length, 2);
});

test('keputusan siap dihitung tapi bukan "Berikutnya"; hanya keputusan siap -> Tidak ada item siap', (t) => {
  const b = summarize(tmpProject(t, { items: [it('k', { slice: 'x', type: 'keputusan', checkpoint: 'Lanjut?' })] }));
  assert.strictEqual(b.answer.text, '1 keputusan menunggu kamu · Tidak ada item siap');
  assert.strictEqual(b.sections[0].items[0].typeLabel, 'Keputusan');
});

test('backlog lama tanpa slice: dikelompokkan per jenis berkata biasa, baris jawaban diberi tahu', (t) => {
  const db = JSON.parse(fs.readFileSync(path.join(FIX, 'docs', 'backlog.json'), 'utf8'));
  db.items.forEach((i) => delete i.slice);
  const b = summarize(tmpProject(t, db));
  assert.strictEqual(b.sliced, false);
  assert.ok(b.answer.text.startsWith('Backlog ini belum dibagi per bagian · '), b.answer.text);
  assert.deepStrictEqual(b.sections.map((s) => s.name).sort(), ['Fitur', 'Fondasi', 'Keputusan']);

  const real = summarize(tmpProject(t, { items: ['be', 'fe', 'ui', 'qa', 'sec', 'review-kode', 'keputusan', 'review', 'audit-akhir'].map((ty) => it(ty, { type: ty })).concat(it('z')) }));
  assert.deepStrictEqual(real.sections.map((s) => s.name).sort(),
    ['Audit akhir', 'Keamanan', 'Keputusan', 'Lainnya', 'Penyambungan', 'Review', 'Server', 'Tampilan', 'Uji']);
});

test('slice campur: yang tanpa slice atau slice bukan teks masuk "Tanpa bagian"; nama biasa dari slug', (t) => {
  const b = summarize(tmpProject(t, { items: [
    it('a', { slice: 'detail-node' }), it('b', { slice: 7 }), it('c', { slice: '  ' }), it('d', { slice: '__proto__' }), it('e')
  ] }));
  assert.deepStrictEqual(brief(b), ['Detail node|notstarted|0/1', 'Tanpa bagian|notstarted|0/3', 'Proto|notstarted|0/1']);
  assert.strictEqual(b.sliced, true);
  assert.strictEqual(({}).total, undefined);
});

test('bagian lebih dari 20 item: item selesai dilipat jadi hitungan; tepat 20 tidak dilipat', (t) => {
  const mk = (n, nDone) => Array.from({ length: n }, (_, k) => it('i' + k, { slice: 'besar', status: k < nDone ? 'done' : 'todo', needs: k < nDone ? [] : ['i0'] }));
  const big = summarize(tmpProject(t, { items: mk(25, 22) })).sections[0];
  assert.strictEqual(big.total, 25);
  assert.strictEqual(big.done, 22);
  assert.strictEqual(big.doneCollapsed, 22);
  assert.deepStrictEqual(big.items.map((i) => i.state), ['ready', 'ready', 'ready']);
  const exact = summarize(tmpProject(t, { items: mk(20, 18) })).sections[0];
  assert.strictEqual(exact.doneCollapsed, 0);
  assert.strictEqual(exact.items.length, 20);
});

test('tanpa item hidup: tanpa bagian, baris jawaban tetap ada, tanpa awalan "belum dibagi"', (t) => {
  const b = summarize(tmpProject(t, { items: [it('p', { status: 'parked' })] }));
  assert.deepStrictEqual(b.sections, []);
  assert.strictEqual(b.answer.text, 'Tidak ada item siap');
  assert.strictEqual(b.parkedGroup.length, 1);
  assert.strictEqual(summarize(tmpProject(t, { items: [] })).answer.text, 'Tidak ada item siap');
});

test('file rusak atau lebih dari 2 MB tetap null (tidak ada bagian)', (t) => {
  assert.strictEqual(summarize(tmpProject(t, '{ rusak')), null);
  const pad = '{"items":[]}' + ' '.repeat(2 * 1024 * 1024);
  assert.strictEqual(summarize(tmpProject(t, pad)), null);
});
