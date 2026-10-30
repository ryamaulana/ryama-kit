const test = require('node:test');
const assert = require('node:assert');
const { analyze, itemOf } = require('../../server/tokens');
const report = require('../../server/token-report');

const T = (m) => new Date(Date.UTC(2026, 9, 29, 8, m)).toISOString();
const L = (rows) => rows.map((x) => JSON.stringify(x)).join('\n');
const usage = (i, o, cr, cc) => ({ input_tokens: i, output_tokens: o, cache_read_input_tokens: cr, cache_creation_input_tokens: cc });

const sub = L([
  { type: 'user', timestamp: T(0), message: { content: 'ITEM mesin-nilai [be] agent=be model=opus\nJudul: Mesin penilaian' } },
  { type: 'assistant', timestamp: T(1), message: { id: 'a1', model: 'claude-opus-5-5', usage: usage(5, 100, 0, 30000), content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'go test ./...' } }] } },
  { type: 'user', timestamp: T(2), message: { content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'x'.repeat(40000) }] } },
  { type: 'assistant', timestamp: T(3), message: { id: 'a2', model: 'claude-opus-5-5', usage: usage(5, 50, 30000, 10000), content: [{ type: 'tool_use', id: 'tu2', name: 'Read', input: { file_path: 'a.png' } }] } },
  { type: 'assistant', timestamp: T(3), message: { id: 'a2', model: 'claude-opus-5-5', usage: usage(5, 60, 30000, 10000), content: [] } },
  { type: 'user', timestamp: T(4), message: { content: [{ type: 'tool_result', tool_use_id: 'tu2', content: [{ type: 'image', source: {} }] }] } },
  { type: 'assistant', timestamp: T(20), isApiErrorMessage: true, message: { id: 's', model: '<synthetic>', content: [{ type: 'text', text: 'Claude usage limit reached' }] } },
  { type: 'assistant', timestamp: T(30), message: { id: 'a3', model: 'claude-opus-5-5', usage: usage(5, 10, 0, 42000), content: [{ type: 'tool_use', id: 'tu3', name: 'Agent', input: { subagent_type: 'fullstack-dev:be', prompt: 'ITEM kontrak-api' } }] } },
  { type: 'user', timestamp: T(40), message: { content: [{ type: 'tool_result', tool_use_id: 'tu3', content: [{ type: 'text', text: 'y'.repeat(8000) }] }] } },
]);

test('item backlog dibaca dari prompt pemanggilan', () => {
  assert.strictEqual(itemOf('ITEM kontrak-api [be] agent=be'), 'kontrak-api');
  assert.strictEqual(analyze(sub).item, 'mesin-nilai');
});

test('pesan streaming dengan id sama dihitung sekali (yang terakhir), pesan synthetic tidak dihitung', () => {
  const A = analyze(sub);
  assert.deepStrictEqual([A.turns, A.out, A.cr, A.cc], [3, 170, 30000, 82000]);
  assert.strictEqual(A.ctxPeak, 42005);
});

test('output tool, gambar, laporan subagent, limit, dan cache ditulis ulang tercatat', () => {
  const A = analyze(sub);
  assert.strictEqual(A.heavy[0].tool, 'Bash'); assert.strictEqual(A.heavy[0].tok, 10000);
  assert.strictEqual(A.imgs, 1);
  assert.strictEqual(A.handbacks.n, 1); assert.strictEqual(A.handbacks.max, 8000); assert.strictEqual(A.handbacks.top[0].to, 'be kontrak-api');
  assert.strictEqual(A.limits.length, 1);
  assert.strictEqual(A.cold.length, 1); assert.strictEqual(A.cold[0].gapMin, 27); assert.strictEqual(A.coldTok, 42000);
});

test('jendela waktu: sesi utama yang melewati beberapa run hanya dihitung sejak run mulai', () => {
  const A = analyze(sub, { from: Date.parse(T(25)) });
  assert.strictEqual(A.turns, 1); assert.strictEqual(A.cc, 42000);
});

test('laporan proyek: waktu kerja/limit/menunggu dan item per run', () => {
  const t0 = Date.parse(T(0));
  const st = { startedAt: t0, nodes: { be: { count: 1, segments: [{ s: t0 + 60e3, e: t0 + 600e3 }], usage: { in: 10, out: 1000, cr: 500000, cc: 40000, turns: 40, ctx: 60000, model: 'claude-sonnet-5-5' }, invocations: [{ item: 'kontrak-api', model: 'sonnet-5-5', byModel: { 'sonnet-5-5': 541010 }, turns: 40, ctxFirst: 1, ctxPeak: 60000, raw: 541010, eq: 1, heavy: [] }] } },
    main: { usage: { in: 5, out: 100, cr: 0, cc: 0, turns: 3, ctx: 1, model: 'claude-opus-5-5' }, tokens: { byModel: { 'opus-5-5': 105 }, cold: [], coldTok: 0, handbacks: { n: 0, avg: 0, max: 0, top: [] }, heavy: [], limits: [{ t: t0 + 700e3 }] } },
    mainSegs: [{ s: t0, e: t0 + 700e3 }, { s: t0 + 3600e3, e: t0 + 3700e3 }], backlog: { done: 10, total: 147 } };
  const R = report.build([{ id: 1, project: 'P', title: 'run', prompt: '', started_at: t0, updated_at: t0 + 3700e3, state: st, convo: [] }], 'P');
  const r = R.runs[0];
  assert.strictEqual(Math.round(r.limit / 60000), 48);
  assert.strictEqual(Math.round(r.work / 60000), 13);
  assert.strictEqual(r.itemsDone, 10);
  assert.strictEqual(R.items[0].item, 'kontrak-api');
  assert.match(report.markdown(R), /## Pemanggilan termahal/);
});

test('laporan agent latar dihitung dari pesan notifikasi, bukan dari tanda mulai Agent', () => {
  const txt = L([
    { type: 'assistant', timestamp: T(0), message: { id: 'm1', model: 'claude-opus-5-5', usage: usage(1, 1, 0, 0), content: [{ type: 'tool_use', id: 'bg1', name: 'Agent', input: { subagent_type: 'fullstack-dev:be', prompt: 'ITEM be-email', run_in_background: true } }] } },
    { type: 'user', timestamp: T(1), message: { content: [{ type: 'tool_result', tool_use_id: 'bg1', content: [{ type: 'text', text: 'Async agent launched successfully.' }] }] } },
    { type: 'user', timestamp: T(9), message: { content: '<task-notification><agent_type>fullstack-dev:be</agent_type>[Subagent hand-back] ITEM be-email selesai. ' + 'z'.repeat(5000) + '</task-notification>' } },
  ]);
  const A = analyze(txt);
  assert.strictEqual(A.handbacks.n, 1);
  assert.ok(A.handbacks.max > 5000);
  assert.strictEqual(A.handbacks.top[0].to, 'be be-email');
});
