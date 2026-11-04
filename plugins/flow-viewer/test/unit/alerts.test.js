const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '../../server/public/js/alerts.js')).href);
const it = (kind, key, at, o = {}) => ({ key, kind, agent: '__main', text: kind + key, options: [], at, ...o });
const S = (attention, o = {}) => ({ nodes: { be: { status: 'running' } }, crewMeta: [{ id: 'be', label: 'Backend' }], attention, ...o });

test('keputusan: pilihan (a)/(b) dan rekomendasi dibaca dari teks checkpoint', async () => {
  const { splitDecision } = await load();
  const d = splitDecision('Hasil replay berhenti. Pilih: (a) terima, notifikasi tetap; (b) ketatkan: kurangi palsu. (rekomendasi: terima bila meleset <= 10%)');
  assert.deepStrictEqual(d.options, ['terima, notifikasi tetap', 'ketatkan: kurangi palsu']);
  assert.strictEqual(d.q, 'Hasil replay berhenti.');
  assert.strictEqual(d.rec, 'terima bila meleset <= 10%');
  assert.deepStrictEqual(splitDecision('Satu run baru? (rekomendasi: ya)'), { q: 'Satu run baru?', options: [], rec: 'ya' });
});

test('Butuh input: terbaru di atas, maks 2 terbuka lalu "+N lainnya", jumlah sebenarnya', async () => {
  const { alertsVm } = await load();
  const v = alertsVm(S([it('question', 'a', 1), it('permission', 'b', 3), it('question', 'c', 2), it('failed', 'f', 9)]));
  assert.deepStrictEqual(v.input.open.map((x) => x.key), ['b', 'c']);
  assert.strictEqual(v.input.total, 3);
  assert.strictEqual(v.input.more, 1);
  assert.strictEqual(v.failed.total, 1);
});

test('kunci sama tidak jadi dua kotak; selesai dan daftar kosong tidak membuka kotak', async () => {
  const { alertsVm } = await load();
  assert.strictEqual(alertsVm(S([it('question', 'a', 1), it('question', 'a', 2)])).input.total, 1);
  assert.strictEqual(alertsVm(S([it('done', 'd', 1)])).any, false);
  assert.strictEqual(alertsVm(S([])).any, false); // terjawab: item hilang dari attention
});

test('keputusan backlog tampil dengan pilihan; pilihan pertanyaan AskUserQuestion dipakai apa adanya', async () => {
  const { alertsVm } = await load();
  const v = alertsVm(S([
    it('question', 'q', 5, { options: ['Ya', 'Tidak'] }),
    it('decision', 'dec:backlog:x', 0, { agent: 'backlog', text: 'Terima? Pilih: (a) ya; (b) tidak (rekomendasi: ya)' }),
  ]));
  assert.deepStrictEqual(v.input.open[0].options, ['Ya', 'Tidak']);
  const d = v.input.open[1];
  assert.deepStrictEqual([d.who, d.title, d.options], ['Backlog', 'Terima?', ['ya', 'tidak']]);
  assert.match(d.ctx, /Rekomendasi: ya\./);
});

test('Gagal: nama agent dari crewMeta, tautan detail hanya untuk node yang ada', async () => {
  const { alertsVm } = await load();
  const v = alertsVm(S([it('failed', 'f1', 2, { agent: 'be', text: '2 tes merah' }), it('failed', 'fail:backlog:x', 1, { agent: 'backlog', text: 'gagal' })]));
  assert.deepStrictEqual(v.failed.open.map((f) => [f.who, f.node]), [['Backend', true], ['Backlog', false]]);
});
