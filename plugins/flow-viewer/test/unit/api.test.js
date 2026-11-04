const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '../../server/public/js/api.js')).href);

// EventSource tiruan: tes memegang instansinya dan memicu onopen/onerror/pesan sendiri.
function fake() {
  const all = [];
  class ES {
    constructor(url) { this.url = url; this.readyState = 0; this.l = {}; all.push(this); }
    addEventListener(t, f) { this.l[t] = f; }
    close() { this.readyState = 2; }
  }
  const timers = [];
  return { ES, all, timers, wait: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clear: () => {} };
}

test('streamUrl: p di-encode; tanpa p memakai daftar', async () => {
  const { streamUrl } = await load();
  assert.strictEqual(streamUrl({ p: 'a b' }), '/stream?p=a%20b');
  assert.strictEqual(streamUrl({ p: null }), '/stream?list=1');
});

test('openStream: pesan default = snapshot, event projects = daftar, JSON rusak dilewati', async () => {
  const { openStream } = await load();
  const f = fake(), got = [];
  openStream('/stream?p=x', { status: () => {}, state: (d) => got.push(['s', d]), projects: (d) => got.push(['p', d]) }, f);
  const es = f.all[0];
  es.onmessage({ data: '{"a":1}' });
  es.l.projects({ data: '{"projects":[]}' });
  es.onmessage({ data: '{rusak' });
  assert.deepStrictEqual(got, [['s', { a: 1 }], ['p', { projects: [] }]]);
});

test('openStream: galat jaringan (EventSource menyambung sendiri) hanya melapor terputus', async () => {
  const { openStream } = await load();
  const f = fake(), st = [];
  openStream('/u', { status: (o) => st.push(o) }, f);
  f.all[0].onopen(); f.all[0].readyState = 0; f.all[0].onerror();
  assert.deepStrictEqual(st, [true, false]);
  assert.strictEqual(f.timers.length, 0);
  assert.strictEqual(f.all.length, 1);
});

test('openStream: server menutup (non-200) -> buka ulang dengan jeda naik, reset saat tersambung, berhenti saat ditutup', async () => {
  const { openStream } = await load();
  const f = fake();
  const stop = openStream('/u', { status: () => {} }, f);
  for (let i = 0; i < 6; i++) { const es = f.all.at(-1); es.readyState = 2; es.onerror(); f.timers.at(-1).f(); }
  assert.deepStrictEqual(f.timers.map((t) => t.ms), [1000, 2000, 4000, 8000, 10000, 10000]);
  assert.strictEqual(f.all.length, 7);
  f.all.at(-1).onopen();
  f.all.at(-1).readyState = 2; f.all.at(-1).onerror();
  assert.strictEqual(f.timers.at(-1).ms, 1000);
  stop();
  f.all.at(-1).onerror();
  assert.strictEqual(f.timers.length, 7);
});
