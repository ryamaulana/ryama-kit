const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '../../server/public/js/route.js')).href);
const mem = (o = {}) => ({ getItem: (k) => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: (k) => { delete o[k]; }, o });

test('parseRoute: tanpa p = Daftar proyek; p + v=riwayat = Riwayat; p sah saja = Live', async () => {
  const { parseRoute } = await load();
  assert.deepStrictEqual(parseRoute(''), { p: null, view: 'live' });
  assert.deepStrictEqual(parseRoute('?v=riwayat'), { p: null, view: 'live' });
  assert.deepStrictEqual(parseRoute('?p=demo'), { p: 'demo', view: 'live' });
  assert.deepStrictEqual(parseRoute('?p=demo&v=riwayat'), { p: 'demo', view: 'history' });
  assert.deepStrictEqual(parseRoute('?p=demo&v=lain'), { p: 'demo', view: 'live' });
});

test('parseRoute: p berbahaya atau tidak sah dianggap tidak ada', async () => {
  const { parseRoute } = await load();
  for (const bad of ['?p=../x', '?p=%2e%2e', '?p=A B', '?p=', '?p=' + 'a'.repeat(65)]) assert.strictEqual(parseRoute(bad).p, null, bad);
});

test('routeUrl: bolak-balik dengan parseRoute', async () => {
  const { parseRoute, routeUrl } = await load();
  assert.strictEqual(routeUrl({ p: null, view: 'history' }), '/');
  assert.strictEqual(routeUrl({ p: 'demo', view: 'live' }), '?p=demo');
  assert.strictEqual(routeUrl({ p: 'demo', view: 'history' }), '?p=demo&v=riwayat');
  assert.deepStrictEqual(parseRoute(routeUrl({ p: 'demo', view: 'history' })), { p: 'demo', view: 'history' });
});

test('soleActive: buka otomatis hanya bila tepat satu proyek aktif', async () => {
  const { soleActive } = await load();
  const P = (id, active) => ({ id, active });
  assert.strictEqual(soleActive({ projects: [P('a', true)], inactive: [{ id: 'b' }] }), 'a');
  assert.strictEqual(soleActive({ projects: [P('a', true), P('b', true)] }), null);
  assert.strictEqual(soleActive({ projects: [P('a', false)] }), null);
  assert.strictEqual(soleActive({ projects: [] }), null);
  assert.strictEqual(soleActive(null), null);
});

test('migrateView: fv-view lama jadi fv-tab, tidak menimpa fv-tab yang ada, idempoten', async () => {
  const { migrateView } = await load();
  const a = mem({ 'fv-view': 'backlog' }); migrateView(a); migrateView(a);
  assert.deepStrictEqual(a.o, { 'fv-tab': 'backlog' });
  const b = mem({ 'fv-view': 'log', 'fv-tab': 'skill' }); migrateView(b);
  assert.deepStrictEqual(b.o, { 'fv-tab': 'skill' });
  const c = mem({ 'fv-view': 'history' }); migrateView(c);
  assert.deepStrictEqual(c.o, {});
});

test('migrateView: penyimpanan yang melempar galat tidak merusak', async () => {
  const { migrateView } = await load();
  assert.doesNotThrow(() => migrateView({ getItem() { throw new Error('blocked'); } }));
});
