const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { summarize } = require('../../server/backlog-summary');

const FIX = path.join(__dirname, '..', 'fixtures', 'backlog-proyek');

// Proyek sementara dengan docs/backlog.json berisi `body` (string mentah); null = tanpa file.
function tmpProject(t, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-bl-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  if (body !== null) {
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, 'docs', 'backlog.json'), body);
  }
  return dir;
}

test('tanpa backlog, JSON rusak, atau bentuk salah -> null (tidak melempar)', (t) => {
  assert.strictEqual(summarize(tmpProject(t, null)), null, 'file tidak ada');
  assert.strictEqual(summarize(tmpProject(t, '{ rusak')), null, 'JSON rusak');
  assert.strictEqual(summarize(tmpProject(t, '{"items": 5}')), null, 'items bukan array');
  assert.strictEqual(summarize(tmpProject(t, 'null')), null, 'isi null');
  assert.strictEqual(summarize(''), null, 'kunci kosong');
  assert.strictEqual(summarize(undefined), null, 'kunci tidak ada');
});

test('backlog kosong atau semua diparkir -> pct null (tampil "-"), bukan NaN', (t) => {
  const empty = summarize(tmpProject(t, '{"items":[]}'));
  assert.deepStrictEqual({ pct: empty.pct, done: empty.done, total: empty.total }, { pct: null, done: 0, total: 0 });
  const allParked = summarize(tmpProject(t, '{"items":[{"id":"p","title":"P","status":"parked","size":"l"}]}'));
  assert.strictEqual(allParked.pct, null);
});

test('entri bukan objek dilewati; field bertipe salah tidak ikut keluar', (t) => {
  const b = summarize(tmpProject(t, JSON.stringify({
    project: { x: 1 },
    items: [null, 5, 'teks',
      { id: 'x', title: { evil: 1 }, status: 'done', size: 's', needs: 'abc', checkpoint: ['q'], agent: 7, notes: 'rahasia' },
      { id: 'y', title: '<img src=x onerror=alert(1)>', status: 'todo', size: 'l', needs: ['x'], checkpoint: 'Setuju?' }]
  })));
  assert.strictEqual(b.items.length, 2);
  assert.strictEqual(b.project, '');
  assert.deepStrictEqual(b.items[0], {
    id: 'x', title: '', type: '', agent: '', status: 'done', needs: [], owner: false,
    evidence: '', size: 's', fase: 'lain', checkpointQ: '', lastFailure: ''
  });
  // Judul berisi HTML diteruskan sebagai teks biasa; escape tugas dom.js di klien.
  assert.deepStrictEqual(b.decisions, [{ id: 'y', title: '<img src=x onerror=alert(1)>', question: 'Setuju?', status: 'ready' }]);
  assert.strictEqual(b.pct, 20); // done 1 / (1 + 4)

  const p = summarize(tmpProject(t, JSON.stringify({ items: [
    { id: 'z', title: 'Z', type: '__proto__', status: 'todo', needs: ['constructor'] }] })));
  assert.strictEqual(({}).total, undefined, 'type __proto__ tidak mencemari Object.prototype');
  assert.deepStrictEqual(p.fase, [{ nama: '__proto__', total: 1, done: 0 }]);
  assert.strictEqual(p.items[0].status, 'waiting', 'needs ke id yang tidak ada (constructor) = menunggu');
});

test('cache per kunci proyek: file tak berubah -> objek sama; mtime berubah -> dibaca ulang', (t) => {
  const item = (st) => `{"items":[{"id":"x","title":"X","status":"${st}","size":"s"},{"id":"y","title":"Y","status":"todo"}]}`;
  const a = tmpProject(t, item('done')), b = tmpProject(t, item('todo'));
  const fa = path.join(a, 'docs', 'backlog.json');
  const t0 = new Date('2026-01-01T00:00:00Z'), t1 = new Date('2026-01-02T00:00:00Z');
  fs.utimesSync(fa, t0, t0);

  const a1 = summarize(a);
  assert.strictEqual(a1.pct, 33); // 1 / (1 + 2)
  assert.strictEqual(summarize(b).pct, 0);
  assert.strictEqual(summarize(a), a1, 'proyek lain dibaca di antaranya, cache A tetap');

  fs.writeFileSync(fa, item('todo')); // ukuran sama, mtime dikembalikan -> cache dipakai
  fs.utimesSync(fa, t0, t0);
  assert.strictEqual(summarize(a), a1, 'mtime dan ukuran sama -> tidak dibaca ulang');

  fs.utimesSync(fa, t1, t1);
  assert.strictEqual(summarize(a).pct, 0, 'mtime berubah -> isi baru terbaca');

  fs.rmSync(fa);
  assert.strictEqual(summarize(a), null, 'file dihapus -> null, bukan cache lama');
});

test('file lebih dari 2 MB tidak dibaca -> null; tepat 2 MB masih dibaca', (t) => {
  const MB2 = 2 * 1024 * 1024;
  const valid = '{"items":[{"id":"x","title":"X","status":"done","size":"s"}]}';
  const pad = (n) => valid + ' '.repeat(n - Buffer.byteLength(valid)); // spasi di akhir tetap JSON sah
  assert.strictEqual(summarize(tmpProject(t, pad(MB2))).pct, 100, 'tepat 2 MB dibaca');
  assert.strictEqual(summarize(tmpProject(t, pad(MB2 + 1))), null, '2 MB + 1 byte ditolak');
});

// Hitungan manual fixture (bobot s=1, m=2, l=4, tanpa ukuran = m; parked a6,d5 dan rejected a7 tidak dihitung):
// hidup: a1 1, a2 2, a3 4, a4 2, a5 4, a8 1, d1 1, d2 2, d3 1, d4 2 = 20
// done : a1 1, a2 2, a3 4, d4 2 = 9  -> 9/20 = 45%; 4 dari 10 item
test('pct berbobot sama dengan hitungan manual, parked dan rejected tidak dihitung', () => {
  const b = summarize(FIX);
  assert.strictEqual(b.pct, 45);
  assert.strictEqual(b.done, 4);
  assert.strictEqual(b.total, 10);
});

// Syarat decision (ARCHITECTURE 5.3): ada checkpoint, status siap atau berjalan, bukan done/rejected/parked.
// d1 siap, d3 berjalan; d2 menunggu a4, d4 done, d5 parked -> tidak masuk.
test('decisions berisi item checkpoint yang siap atau berjalan saja', () => {
  const b = summarize(FIX);
  assert.deepStrictEqual(b.decisions, [
    { id: 'd1', title: 'Keputusan siap', question: 'Pakai tema gelap default?', status: 'ready' },
    { id: 'd3', title: 'Keputusan berjalan', question: 'Simpan riwayat 200 run?', status: 'running' }
  ]);
});

test('ringkasan memuat fase, parked, hitungan status, dan item dengan status turunan (bentuk 1.7.1)', () => {
  const b = summarize(FIX);
  assert.strictEqual(b.project, 'Proyek fixture');
  assert.deepStrictEqual(b.fase, [
    { nama: 'fondasi', total: 2, done: 2 },
    { nama: 'fitur', total: 4, done: 1 },
    { nama: 'keputusan', total: 4, done: 1 }
  ]);
  assert.deepStrictEqual(b.parked, [{ id: 'a6', title: 'Diparkir besar' }, { id: 'd5', title: 'Keputusan diparkir' }]);
  assert.deepStrictEqual(
    { running: b.running, ready: b.ready, waiting: b.waiting, failed: b.failed },
    { running: 2, ready: 2, waiting: 1, failed: 1 });
  assert.strictEqual(b.items.length, 13);
  assert.deepStrictEqual(b.items.find((i) => i.id === 'd2'), {
    id: 'd2', title: 'Keputusan menunggu', type: 'keputusan', agent: '', status: 'waiting', needs: ['a4'],
    owner: true, evidence: '', size: 'm', fase: 'keputusan', checkpointQ: 'Rilis minggu ini?', lastFailure: ''
  });
  assert.strictEqual(b.items.find((i) => i.id === 'a4').size, 'm', 'tanpa ukuran = m');
  assert.strictEqual(b.items.find((i) => i.id === 'a8').lastFailure, 'port bentrok');
});
