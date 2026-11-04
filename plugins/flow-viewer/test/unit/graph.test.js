const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '../../server/public/js/graph.js')).href);
const meta = (n) => Array.from({ length: n }, (_, i) => ({ id: 'a' + i, col: 1 + (i % 3), row: Math.floor(i / 3) }));
const S12 = () => ({ crewMeta: meta(12), nodes: {} });
const cells = (tiles) => tiles.map((t) => t.col + ',' + t.row);

test('layoutTiles: 12 agent + Prompt + Sesi utama = 14 node di sel berbeda; kolom 0 hanya Prompt dan Sesi utama', async () => {
  const { layoutTiles } = await load();
  const t = layoutTiles(S12());
  assert.strictEqual(t.length, 14);
  assert.strictEqual(new Set(cells(t)).size, 14);
  assert.deepStrictEqual(t.filter((x) => x.col === 0).map((x) => x.id), ['__prompt', '__main']);
});

test('layoutTiles: 20 agent, posisi bentrok digeser sehingga tidak ada yang menimpa', async () => {
  const { layoutTiles } = await load();
  const cm = meta(20).map((m) => ({ ...m, col: 2, row: 0 })); // semua minta sel yang sama
  const t = layoutTiles({ crewMeta: cm, nodes: {} });
  assert.strictEqual(new Set(cells(t)).size, 22);
});

test('layoutTiles: agent yang jalan tapi bukan crew ditaruh di kolom kanan, bertanda extra', async () => {
  const { layoutTiles } = await load();
  const t = layoutTiles({ crewMeta: meta(3), nodes: { liar: { status: 'running' } } });
  const x = t.find((n) => n.id === 'liar');
  assert.ok(x.extra && x.col === 4 && x.row === 0);
});

test('layoutEdges: akar flow disambung dari Sesi utama; agent di luar flow dan edge ke node tak dikenal tidak', async () => {
  const { layoutTiles, layoutEdges } = await load();
  const S = { crewMeta: meta(3), nodes: {}, expected: ['a0', 'a1'], edges: [['a0', 'a1'], ['a0', 'hantu']] };
  const e = layoutEdges(S, layoutTiles(S));
  assert.deepStrictEqual(e, [['__prompt', '__main'], ['__main', 'a0'], ['a0', 'a1']]);
});

test('pickView: penuh skala 1 bila muat; kalau tidak ringkas, skala tak di bawah 0,89 (dipan)', async () => {
  const { layoutTiles, pickView } = await load();
  const t = layoutTiles(S12()); // 4 kolom x 4 baris: penuh 1048 x 542
  assert.deepStrictEqual([pickView(t, { w: 1100, h: 600 }).mode, pickView(t, { w: 1100, h: 600 }).scale], ['full', 1]);
  const c = pickView(t, { w: 800, h: 500 });
  assert.strictEqual(c.mode, 'compact');
  assert.ok(c.scale >= 0.89 && c.scale <= 1);
  assert.strictEqual(pickView(t, { w: 300, h: 200 }).scale, 0.89);
});

test('edgePath: antar kolom = kurva dari port kanan ke port kiri; kolom sama = garis lurus vertikal', async () => {
  const { edgePath, DIM } = await load();
  const d = DIM.full;
  assert.match(edgePath({ col: 0, row: 0 }, { col: 1, row: 0 }, d), /^M232 61C.* 272 61$/);
  assert.strictEqual(edgePath({ col: 1, row: 0 }, { col: 1, row: 1 }, d), 'M388 122L388 136');
});

test('nodeVm agent: putaran hanya bila > 1, durasi berjalan bertambah, gagal menampilkan alasan', async () => {
  const { nodeVm, layoutTiles } = await load();
  const S = { crewMeta: [{ id: 'be', col: 2, row: 0, label: 'Backend' }], nodes: { be: { status: 'running', count: 2, ms: 60000, startedAt: 1000, last: 'Bash npm test' } } };
  const t = layoutTiles(S).find((x) => x.id === 'be');
  const v = nodeVm(S, t, 31000);
  assert.deepStrictEqual([v.label, v.k, v.meta], ['Backend', 'running', ['Putaran 2', '1 mnt']]);
  S.nodes.be.failReason = '2 tes merah';
  const f = nodeVm(S, t, 31000);
  assert.deepStrictEqual([f.k, f.act[0]], ['failed', '2 tes merah']);
  S.nodes.be = { status: 'idle', count: 0, role: 'API' };
  assert.deepStrictEqual([nodeVm(S, t, 0).k, nodeVm(S, t, 0).meta, nodeVm(S, t, 0).act[0]], ['waiting', [], 'API']);
});

test('nodeVm Sesi utama: Butuh input punya teks penuh dan ringkas; Menunggu hanya sebelum prompt pertama', async () => {
  const { nodeVm, layoutTiles } = await load();
  const main = (S) => nodeVm(S, layoutTiles(S).find((t) => t.id === '__main'), 0);
  const asking = main({ nodes: {}, attention: [{ kind: 'question', agent: '__main' }] });
  assert.deepStrictEqual([asking.k, asking.act], ['input', ['Butuh input: lihat pertanyaan di atas', 'Lihat pertanyaan di atas']]);
  assert.strictEqual(main({ nodes: {} }).k, 'waiting');
  assert.strictEqual(main({ nodes: {}, prompt: 'bangun' }).k, 'done');
});

test('agentIcon: ikon dari data hanya lolos bila murni tag grafis; sisanya diganti ikon umum', async () => {
  const { agentIcon } = await load();
  const ok = '<path d="M14 3H7a2 2 0 0 0-2 2z"/><circle cx="12" cy="12" r="3"/>';
  assert.ok(String(agentIcon(ok)).includes('M14 3H7'));
  for (const bad of ['<path d="x" onload="alert(1)"/>', '<script>alert(1)</script>', '<path d="a"/><img src=x>', undefined]) {
    const out = String(agentIcon(bad));
    assert.ok(!/onload|script|img/.test(out), out);
  }
});

test('nodeHtml: nama dan alasan dari data di-escape', async () => {
  const { nodeHtml } = await load();
  const out = String(nodeHtml({ id: 'x', label: '<img src=x onerror=1>', k: 'failed', meta: [], act: ['"><b>'], snip: '' }));
  assert.ok(!out.includes('<img') && !out.includes('"><b>'));
});
