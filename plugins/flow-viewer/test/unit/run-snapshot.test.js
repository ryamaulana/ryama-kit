// t09b: snapshot = superset 1.7.1 + project, live, progress, tokens (pembanding), attention. ARCHITECTURE 5.3-5.5, 10.1.
const test = require('node:test');
const assert = require('node:assert');
const { createRun, catalogFromFlows } = require('../../server/run');

const FLOWS = {
  free: { title: 'Overview', nodes: [{ id: 'be', col: 0, row: 0, role: 'backend' }, { id: 'qa', col: 1, row: 0, role: 'uji' }], edges: [['be', 'qa']] },
  run: { title: 'Run backlog', nodes: [{ id: 'be', col: 0, row: 0, role: 'backend' }, { id: 'qa', col: 1, row: 0, role: 'uji' }], edges: [['be', 'qa']] },
};
let T;
const adv = (ms) => { T += ms; };
const mk = (extra = {}) => {
  T = 1_700_000_000_000;
  return createRun({ key: 'D:\\01_Workspace\\app-x', flow: 'free', catalog: catalogFromFlows(FLOWS, {}), now: () => (T += 10), ...extra });
};
const P = { hook_event_name: 'UserPromptSubmit', prompt: 'halo', session_id: 's1' };
const STOP = (extra = {}) => ({ hook_event_name: 'Stop', session_id: 's1', last_assistant_message: 'Beres.', ...extra });
const AGENT_PRE = { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'g1', session_id: 's1', tool_input: { subagent_type: 'be', prompt: 'x', description: 'be' } };
const BL = (over = {}) => ({ pct: 40, done: 2, total: 5, items: [], decisions: [], ...over });

test('field 1.7.1 tidak berubah dan field baru terisi', () => {
  const r = mk({ flow: 'run' });
  r.apply(P);
  const s = r.snapshot();
  const V171 = ['nodes', 'main', 'crew', 'crewMeta', 'crewEdges', 'edges', 'expected', 'flow', 'title', 'runId', 'finished', 'prompt', 'log', 'backlog', 'fileList', 'pending', 'convoN', 'skillCalls', 'mainSkills'];
  for (const f of V171) assert.ok(f in s, 'field 1.7.1 hilang: ' + f);
  assert.deepStrictEqual([s.flow, s.title, s.prompt, s.finished, s.pending, s.convoN, s.expected], ['run', 'Run backlog', 'halo', false, null, 1, ['be', 'qa']]);
  for (const f of ['project', 'live', 'phase', 'progress', 'tokens', 'attention']) assert.ok(f in s, 'field baru hilang: ' + f);
  assert.strictEqual(s.live, true);
  assert.strictEqual(s.phase, 'running');
});

test('project: dari kunci bila tidak diinjeksi; id dan nama dari registri bila diinjeksi (getter, dibaca tiap snapshot)', () => {
  assert.deepStrictEqual(mk().snapshot().project, { id: '', name: 'app-x', shortPath: '01_Workspace/app-x', path: 'D:\\01_Workspace\\app-x' });
  let id = 'app-x';
  const r = mk({ project: () => ({ id, name: 'app-x', shortPath: '01_Workspace/app-x' }) });
  assert.strictEqual(r.snapshot().project.id, 'app-x');
  id = 'app-x-abc123'; // slug kembar muncul belakangan
  assert.strictEqual(r.snapshot().project.id, 'app-x-abc123');
  assert.strictEqual(r.snapshot().project.path, 'D:\\01_Workspace\\app-x');
});

test('progres 5.4: backlog berbobot dulu, lalu langkah wajib, lalu null', () => {
  assert.deepStrictEqual(mk({ flow: 'run', backlog: () => BL() }).snapshot().progress, { pct: 40, label: 'Backlog 2 dari 5 item' });
  const r = mk({ flow: 'run' }); // tanpa backlog: be jalan, qa belum
  r.apply(P); r.apply(AGENT_PRE);
  assert.deepStrictEqual(r.snapshot().progress, { pct: 50, label: 'Langkah wajib 1 dari 2' });
  assert.deepStrictEqual(mk({ flow: 'run', backlog: () => BL({ pct: null, done: 0, total: 0 }) }).snapshot().progress.label, 'Langkah wajib 0 dari 2'); // backlog kosong = tidak terbaca
  assert.deepStrictEqual(mk().snapshot().progress, { pct: null, label: '' }); // free tanpa backlog
});

test('token 5.5: setara input, pembanding, selisih persen, Boros hanya bila > +50%', () => {
  const cmp = () => ({ id: 5, tokens_eq: 100, started_at: 1000, updated_at: 4000 });
  const r = mk({ compare: cmp });
  assert.deepStrictEqual(r.snapshot().tokens, { eq: null, prevEq: 100, deltaPct: null, boros: false }); // belum ada usage
  r.state.main.usage = { in: 100, out: 10, cr: 0, cc: 0 }; // 100 + 10*5 = 150 = persis +50%
  assert.deepStrictEqual(r.snapshot().tokens, { eq: 150, prevEq: 100, deltaPct: 50, boros: false });
  r.state.main.usage = { in: 101, out: 10, cr: 0, cc: 0 }; // 151
  assert.deepStrictEqual(r.snapshot().tokens, { eq: 151, prevEq: 100, deltaPct: 51, boros: true });
  r.state.main.usage = { in: 20, out: 0, cr: 0, cc: 80 }; // 20 + 80*1,25 = 120
  assert.deepStrictEqual(r.snapshot().tokens, { eq: 120, prevEq: 100, deltaPct: 20, boros: false });
  const none = mk(); none.state.main.usage = { in: 10, out: 0, cr: 0, cc: 0 };
  assert.deepStrictEqual(none.snapshot().tokens, { eq: 10, prevEq: null, deltaPct: null, boros: false });
});

test('pembanding dicari dengan flow, id run sendiri, dan ada-tidaknya agent; hasil dipakai ulang', () => {
  const calls = [];
  const r = mk({ flow: 'free', compare: (q) => { calls.push(q); return null; } });
  r.snapshot(); r.snapshot();
  assert.deepStrictEqual(calls, [{ flow: 'free', beforeId: r.id, withAgents: false }]);
  r.apply(P); r.apply(AGENT_PRE); // agent jalan: run ini kini dibanding dengan run beragen
  r.snapshot(); r.snapshot();
  assert.deepStrictEqual(calls.map((c) => c.withAgents), [false, true]);
});

test('pembanding dihapus dari riwayat -> prev null; id lain tidak berpengaruh; galat pencarian tidak melempar', () => {
  const r = mk({ compare: () => ({ id: 5, tokens_eq: 100, started_at: 0, updated_at: 1 }) });
  r.state.main.usage = { in: 300, out: 0, cr: 0, cc: 0 };
  assert.strictEqual(r.snapshot().tokens.boros, true);
  r.dropCompare(6);
  assert.strictEqual(r.snapshot().tokens.prevEq, 100);
  r.dropCompare(5);
  assert.deepStrictEqual(r.snapshot().tokens, { eq: 300, prevEq: null, deltaPct: null, boros: false });
  assert.strictEqual(mk({ compare: () => { throw new Error('db'); } }).snapshot().tokens.prevEq, null);
});

test('attention: pertanyaan, izin, gagal, keputusan backlog, selesai; kunci stabil antar snapshot', () => {
  const b = BL({ items: [
    { id: 'k1', status: 'ready', checkpointQ: 'Pilih A atau B?', title: 'x' },
    { id: 'f1', status: 'failed', lastFailure: 'tes merah', title: 'y' },
  ] });
  const r = mk({ backlog: () => b });
  r.apply(P);
  r.apply({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', session_id: 's1', tool_input: { questions: [{ question: 'Lanjut?', options: [{ label: 'Ya' }] }] } });
  const a1 = r.snapshot().attention, a2 = r.snapshot().attention;
  assert.deepStrictEqual(a1.map((x) => x.kind).sort(), ['decision', 'failed', 'question']);
  assert.deepStrictEqual(a1.map((x) => x.key), a2.map((x) => x.key));
  const q = a1.find((x) => x.kind === 'question');
  assert.deepStrictEqual([q.text, q.options], ['Lanjut?', ['Ya']]);
  assert.ok(a1.some((x) => x.key === 'dec:backlog:k1') && a1.some((x) => x.key === 'fail:backlog:f1'));

  const f = mk();
  f.apply(P); f.apply(STOP()); adv(2100);
  const done = f.snapshot().attention;
  assert.deepStrictEqual(done.map((x) => [x.kind, x.key]), [['done', `done:s1:main:${f.id}`]]);
  assert.ok(done[0].at > 0);
  assert.strictEqual(f.snapshot().attention[0].at, done[0].at, 'at selesai tidak bergeser antar snapshot');
});

test('attention: agent gagal membawa alasan dan waktu; Jeda tidak membuat item', () => {
  const r = mk();
  r.apply(P); r.apply(AGENT_PRE);
  r.apply({ hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_use_id: 'g1', session_id: 's1', tool_response: { error: 'timeout' } });
  const x = r.snapshot().attention.find((i) => i.kind === 'failed');
  assert.deepStrictEqual([x.agent, x.text, x.key], ['be', 'timeout', `fail:s1:be:${r.id}.1`]);
  assert.ok(x.at > 0);
  const p = mk();
  p.apply(P); p.apply(STOP({ last_assistant_message: 'Lanjut?' })); adv(2100);
  assert.deepStrictEqual([p.snapshot().phase, p.snapshot().attention], ['paused', []]);
});

test('agent diam 5.3: running dan > 10 menit tanpa event = quiet; ada event baru = tidak', () => {
  const r = mk();
  r.apply(P); r.apply(AGENT_PRE);
  assert.deepStrictEqual([r.snapshot().nodes.be.quiet, r.snapshot().nodes.qa.quiet], [false, false]);
  adv(10 * 60 * 1000 + 1000);
  const n = r.snapshot().nodes.be;
  assert.deepStrictEqual([n.quiet, n.lastEventAt > 0], [true, true]);
  r.apply({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_use_id: 'u9', agent_type: 'be', agent_id: 'a1', session_id: 's1', tool_input: { file_path: 'a.js' } });
  assert.strictEqual(r.snapshot().nodes.be.quiet, false);
});

test('kunci pending 5.3: tool_use_id, idle_prompt per Stop, permission_prompt tidak dobel, Notification saat finished diabaikan', () => {
  const r = mk();
  r.apply(P);
  r.apply({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_use_id: 'tq1', session_id: 's1', tool_input: { questions: [{ question: 'Lanjut?', options: [] }] } });
  assert.strictEqual(r.pending[0].key, 's1:main'.replace(/^/, 'q:') + ':tq1');
  r.apply({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', session_id: 's1', agent_type: 'be', agent_id: 'a1', tool_input: { command: 'x' } });
  r.apply({ hook_event_name: 'Notification', notification_type: 'permission_prompt', message: 'izin', session_id: 's1', agent_type: 'be', agent_id: 'a1' });
  assert.deepStrictEqual(r.pending.map((p) => p.key), ['q:s1:main:tq1', `perm:s1:a1:${r.id}.1`]); // permission_prompt tidak membuat item kedua

  const w = mk();
  w.apply(P); w.apply(STOP({ last_assistant_message: 'Setuju?' })); adv(2100);
  assert.strictEqual(w.phase, 'paused');
  const idle = { hook_event_name: 'Notification', notification_type: 'idle_prompt', message: 'Claude is waiting for your input', session_id: 's1' };
  w.apply(idle); const k1 = w.snapshot().attention.map((x) => x.key);
  adv(60000); w.apply(idle);
  assert.deepStrictEqual(w.snapshot().attention.map((x) => x.key), k1);
  assert.deepStrictEqual(k1, [`q:s1:main:${w.id}.w1`]);

  const f = mk();
  f.apply(P); f.apply(STOP()); adv(2100); f.tick(); // tick server menyelesaikan run
  f.apply(idle);
  assert.deepStrictEqual(f.snapshot().attention.map((x) => x.kind), ['done']); // Selesai tidak ditambah pertanyaan
});
