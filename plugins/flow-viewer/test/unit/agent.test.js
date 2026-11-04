// t19a (F4-1, F4-2): status lipat detail agent: bawaan, bertahan antar agent, nilai rusak diabaikan, agent belum jalan.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (f) => import(pathToFileURL(path.join(__dirname, '../../server/public/js', f)).href);
const ranNode = { status: 'done', count: 1, ms: 5000, snippet: 'Selesai: ok', usage: { in: 1000, out: 100 } };
const S = { nodes: { prd: ranNode, qa: { status: 'idle', count: 0 } } };
const open = (v, sec) => new RegExp(`data-sec="${sec}" aria-expanded="true"`).test(String(v.secs));

test('bawaan: hasil dan files terbuka, sisanya terlipat', async () => {
  const { agentView } = await load('tabs/agent.js');
  const v = agentView(S, 'prd', {});
  for (const s of ['hasil', 'files']) assert.ok(open(v, s), s);
  for (const s of ['tugas', 'langkah', 'skill', 'model', 'token', 'def']) assert.ok(!open(v, s), s);
});

test('status lipat satu untuk semua agent; tanpa tab', async () => {
  const { agentView, toggled } = await load('tabs/agent.js');
  const st = toggled(toggled({}, 'langkah', ranNode), 'hasil', ranNode);
  S.nodes.fe = { ...ranNode };
  const v = agentView(S, 'fe', st);
  assert.ok(open(v, 'langkah') && !open(v, 'hasil'));
  assert.ok(!/data-tab|agtabs/.test(String(v.head) + String(v.secs)));
});

test('nilai tersimpan rusak diabaikan, hanya boolean dipakai', async () => {
  const { readSecs } = await load('tabs/agent.js');
  assert.deepStrictEqual(readSecs('{bukan json'), {});
  assert.deepStrictEqual(readSecs(null), {});
  assert.deepStrictEqual(readSecs('[1]'), {});
  assert.deepStrictEqual(readSecs('{"hasil":false,"files":"ya"}'), { hasil: false });
});

test('agent belum jalan: hanya def, model, skill, terbuka; jawaban "Belum jalan di run ini."', async () => {
  const { agentView } = await load('tabs/agent.js');
  const v = agentView(S, 'qa', {});
  assert.deepStrictEqual([...String(v.secs).matchAll(/<section class="dsec" data-sec="(\w+)"/g)].map((m) => m[1]), ['skill', 'model', 'def']);
  assert.ok(['skill', 'model', 'def'].every((s) => open(v, s)));
  assert.match(String(v.ans), /Belum jalan di run ini\./);
});

test('node Prompt, Claude, atau id tak dikenal: tanpa detail agent', async () => {
  const { agentView } = await load('tabs/agent.js');
  for (const id of ['__prompt', '__main', 'xx']) assert.strictEqual(agentView(S, id, {}), null);
});
