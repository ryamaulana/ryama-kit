const test = require('node:test');
const assert = require('node:assert');
const agents = require('../../server/agents'); // katalog asli (flows.json produksi), bukan catalogFromFlows
const { createRun } = require('../../server/run');
const { createRegistry } = require('../../server/projects');

// Sama seperti server.js:39: katalog asli + refresh() yang mengembalikan false.
const real = { catalogFor: (key) => ({ ...agents.catalogFor(key), refresh: () => false }) };
const P = { hook_event_name: 'UserPromptSubmit', prompt: '/fullstack-dev:run', cwd: 'D:/proyek-uji' };
const STOP = (m) => ({ hook_event_name: 'Stop', last_assistant_message: m });

test('katalog asli: flow(run) membawa batch; nama tak dikenal dan "agents" = null; free selalu ada', () => {
  const cat = agents.catalogFor('');
  assert.strictEqual(cat.flow('run').batch, true);
  assert.strictEqual(cat.flow('xyz'), null);
  assert.strictEqual(cat.flow('agents'), null);
  assert.strictEqual(cat.flow('free').name, 'free');
});

test('katalog asli: run flow batch berhenti tanpa langkah wajib = selesai, bukan jeda', () => {
  let T = 1_700_000_000_000;
  const now = () => (T += 10);
  const r = createRun({ key: 'D:/proyek-uji', flow: 'run', catalog: real.catalogFor(''), now });
  r.apply(P);
  r.apply(STOP('Batch selesai.'));
  T += 2100;
  assert.strictEqual(r.phase, 'finished');
});

test('katalog asli: /build xyz tidak membuat run flow "xyz" berisi langkah wajib', () => {
  let T = 1_700_000_000_000;
  const reg = createRegistry({ catalog: real, now: () => (T += 10) });
  reg.ingest({ hook_event_name: 'UserPromptSubmit', prompt: '/build xyz', cwd: 'D:/proyek-uji', session_id: 's1' });
  const s = reg.all()[0].run.snapshot();
  assert.strictEqual(s.flow, 'free');
  assert.deepStrictEqual(s.expected, []);
});

test('JEDA di /report.md mempertahankan huruf s (regex \\s+ bukan s+)', () => {
  let T = 1_700_000_000_000;
  const now = () => (T += 10);
  const r = createRun({ key: 'D:/proyek-uji', flow: 'free', catalog: real.catalogFor(''), now });
  r.apply(P);
  r.apply(STOP('Sudah siap, lanjut sesi berikutnya?'));
  T += 2100;
  assert.strictEqual(r.phase, 'paused');
  assert.ok(r.report().includes('STATUS: JEDA: Sudah siap, lanjut sesi berikutnya?'), r.report());
});
