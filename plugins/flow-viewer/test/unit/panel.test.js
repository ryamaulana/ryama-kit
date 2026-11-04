// t18a (F9-1): rel enam kunci, lencana, lebar, node terlihat, tab Percakapan dan Backlog (data 1.7.1).
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (f) => import(pathToFileURL(path.join(__dirname, '../../server/public/js', f)).href);

test('rel hanya enam kunci; kunci lama (agent, history) jatuh ke chat', async () => {
  const { RAIL, validTab } = await load('panel.js');
  assert.deepStrictEqual(RAIL, ['chat', 'backlog', 'files', 'skill', 'token', 'log']);
  assert.strictEqual(validTab('token'), 'token');
  for (const t of ['agent', 'history', null, '']) assert.strictEqual(validTab(t), 'chat');
});

test('panel: 900-1199 selalu tertutup, 1200+ ikut pilihan tersimpan (bawaan terbuka)', async () => {
  const { startCollapsed } = await load('panel.js');
  assert.strictEqual(startCollapsed(900, '0'), true);
  assert.strictEqual(startCollapsed(1199, null), true);
  assert.strictEqual(startCollapsed(1440, null), false);
  assert.strictEqual(startCollapsed(1440, '1'), true);
});

test('lebar panel: 320 sampai 60% layar; nilai rusak jatuh ke 380', async () => {
  const { clampWidth } = await load('panel.js');
  assert.strictEqual(clampWidth(100, 1440), 320);
  assert.strictEqual(clampWidth(2000, 1440), 864);
  assert.strictEqual(clampWidth(500, 1440), 500);
  assert.strictEqual(clampWidth(NaN, 1440), 380);
});

test('lencana: warn hanya Percakapan (pertanyaan) dan Backlog (keputusan); angka nol tidak tampil; tanpa total', async () => {
  const { badges } = await load('panel.js');
  assert.deepStrictEqual(badges({}), {});
  const S = {
    pending: { kind: 'question', text: 'Lanjut?' },
    backlog: { total: 77, items: [{ owner: true, status: 'ready' }, { owner: true, status: 'done' }, { owner: false, status: 'ready' }] },
    fileList: [{}, {}, {}],
    nodes: { fe: { status: 'done', skillsDef: ['a', 'b'], skills: ['a'], usage: { skillEv: {} } }, be: { status: 'done', skillsDef: ['a'], skills: ['a'] } },
  };
  const b = badges(S);
  assert.deepStrictEqual(Object.keys(b).sort(), ['backlog', 'chat', 'files', 'skill']);
  assert.ok(b.chat.warn && b.backlog.warn);
  assert.ok(!b.files.warn && !b.skill.warn);
  assert.deepStrictEqual([b.chat.n, b.backlog.n, b.files.n, b.skill.n], [1, 1, 3, 1]);
  assert.ok(!('token' in b) && !('log' in b));
  // Server baru: S.attention menggantikan perhitungan lokal
  const A = badges({ attention: [{ kind: 'permission' }, { kind: 'failed' }, { kind: 'decision' }, { kind: 'decision' }, { kind: 'done' }] });
  assert.deepStrictEqual([A.chat.n, A.backlog.n], [1, 2]);
});

test('node terpilih di luar area gulir digeser sampai terlihat; yang sudah terlihat tidak digeser', async () => {
  const { scrollDelta } = await load('panel.js');
  const view = { left: 0, top: 0, right: 500, bottom: 400 };
  assert.deepStrictEqual(scrollDelta({ left: 100, top: 100, right: 300, bottom: 200 }, view), { dx: 0, dy: 0 });
  assert.deepStrictEqual(scrollDelta({ left: 450, top: 100, right: 680, bottom: 200 }, view, 16), { dx: 196, dy: 0 });
  assert.deepStrictEqual(scrollDelta({ left: -60, top: 380, right: 100, bottom: 480 }, view, 16), { dx: -76, dy: 96 });
});

const convoGet = (body, ok = true) => async () => ({ ok, json: async () => body });

test('percakapan: memuat dari /detail?id=__convo dengan proyek; galat tidak mengulang sendiri; Coba lagi memulihkan', async () => {
  const { createConvo } = await load('tabs/chat.js');
  const urls = [];
  let fail = true;
  const c = createConvo(async (u) => { urls.push(u); if (fail) throw new Error('x'); return { ok: true, json: async () => ({ convo: [{ t: 1, kind: 'user', text: 'a' }] }) }; });
  assert.ok(c.need('r1:1'));
  await c.load('demo', 'r1:1');
  assert.strictEqual(urls[0], '/detail?p=demo&id=__convo');
  assert.ok(c.st.err && c.st.list === null);
  assert.ok(!c.need('r1:2'), 'galat tidak dicoba ulang otomatis');
  fail = false; c.retry();
  await c.load('demo', 'r1:2');
  assert.ok(!c.st.err && c.st.list.length === 1 && !c.need('r1:2') && c.need('r1:3'));
});

test('percakapan: respons non-200 jadi galat; hasil lama dari proyek sebelumnya dibuang setelah reset', async () => {
  const { createConvo } = await load('tabs/chat.js');
  const a = createConvo(convoGet({}, false));
  await a.load('demo', 'k');
  assert.ok(a.st.err);
  let release;
  const b = createConvo(() => new Promise((ok) => { release = () => ok({ ok: true, json: async () => ({ convo: [{ t: 1, kind: 'user', text: 'lama' }] }) }); }));
  const p = b.load('lama', 'k');
  b.reset();
  release(); await p;
  assert.strictEqual(b.st.list, null);
  assert.ok(!b.st.busy);
});

test('percakapan: state memuat, kosong, galat (dengan isi lama), sukses; teks di-escape', async () => {
  const { chatView } = await load('tabs/chat.js');
  const S = { crewMeta: [{ id: 'prd', label: 'Penulis PRD' }], pending: { kind: 'question', text: 'q' } };
  assert.match(String(chatView(S, { list: null, err: false })), /Memuat percakapan/);
  assert.match(String(chatView(S, { list: [], err: false })), /Belum ada percakapan/);
  const e = String(chatView(S, { list: null, err: true }));
  assert.match(e, /Percakapan gagal dimuat/);
  assert.match(e, /data-act="retry-chat"/);
  const keep = String(chatView(S, { list: [{ t: 0, kind: 'user', text: 'halo' }], err: true }));
  assert.ok(/halo/.test(keep) && /Coba lagi/.test(keep), 'isi lama tetap + galat');
  const x = String(chatView(S, { list: [{ t: 0, kind: 'user', text: '<img src=x onerror=1>' }], err: false }));
  assert.ok(!/<img/.test(x) && /&lt;img/.test(x));
});

test('percakapan: petunjuk "Jawab di aplikasi Claude." hanya di pertanyaan terakhir saat masih menunggu; agent memakai label', async () => {
  const { chatView } = await load('tabs/chat.js');
  const list = [
    { t: 0, kind: 'question', text: 'lama', agent: 'prd' },
    { t: 1, kind: 'user', text: 'jawab' },
    { t: 2, kind: 'question', text: 'baru', agent: '', questions: [{ question: 'Gratis?', options: [{ label: 'Ya', description: 'semua' }, { label: 'Tidak' }] }] },
  ];
  const waiting = String(chatView({ crewMeta: [{ id: 'prd', label: 'Penulis PRD' }], pending: { kind: 'question' } }, { list, err: false }));
  assert.strictEqual(waiting.split('Jawab di aplikasi Claude.').length - 1, 1);
  assert.match(waiting, /Penulis PRD/);
  assert.match(waiting, /<ol class="opts"><li>Ya/);
  const done = String(chatView({ pending: null }, { list, err: false }));
  assert.ok(!/Jawab di aplikasi Claude/.test(done));
});

test('percakapan: teks panjang dipotong dengan "Tampilkan semua", terbuka lewat kunci', async () => {
  const { chatView } = await load('tabs/chat.js');
  const list = [{ t: 5, kind: 'claude', text: 'x'.repeat(900) }];
  const cut = String(chatView({}, { list, err: false }, new Set()));
  assert.match(cut, /Tampilkan semua/);
  assert.ok(!cut.includes('x'.repeat(401)));
  const full = String(chatView({}, { list, err: false }, new Set(['5:0'])));
  assert.ok(full.includes('x'.repeat(900)) && /Ringkas/.test(full));
});

test('backlog sementara: kosong, dan kelompok urut Perlu keputusan lebih dulu; Selesai dibatasi 3', async () => {
  const { backlogView } = await load('tabs/backlog.js');
  assert.match(String(backlogView({ backlog: null })), /belum punya backlog/);
  const items = [
    { id: 'a', title: 'Item A', status: 'done', needs: [], owner: false },
    { id: 'b', title: 'Item B', status: 'done', needs: [], owner: false },
    { id: 'c', title: 'Item C', status: 'done', needs: [], owner: false },
    { id: 'd', title: 'Item D', status: 'done', needs: [], owner: false },
    { id: 'e', title: 'Pilih harga', status: 'ready', needs: [], owner: true },
    { id: 'f', title: 'Item F', status: 'waiting', needs: ['e'], owner: false },
  ];
  const h = String(backlogView({ backlog: { total: 6, done: 4, pct: 66, items, parked: [] } }));
  assert.ok(h.indexOf('Perlu keputusanmu') < h.indexOf('Menunggu giliran') && h.indexOf('Menunggu giliran') < h.indexOf('Selesai'));
  assert.match(h, /menunggu Pilih harga/);
  assert.match(h, /\+1 lainnya/);
  assert.match(h, /66%/);
});
