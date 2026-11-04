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
  const now = () => (T += 10);
  return createRun({ key: 'D:/proyek', flow: 'free', catalog: catalogFromFlows(FLOWS, { be: { model: 'sonnet', description: 'x', tools: 'Bash', skills: ['tdd'] } }), now, ...extra });
};
// Urutan event nyata ala feed.js lama: prompt, agent be bekerja, edit file, selesai, Stop.
const FEED = [
  { hook_event_name: 'UserPromptSubmit', prompt: 'kerjakan item t05a', cwd: 'D:/proyek' },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'u1', tool_input: { subagent_type: 'be', prompt: 'ITEM t05a', description: 'be' } },
  { hook_event_name: 'SubagentStart', agent_type: 'be', agent_id: 'a1' },
  { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_use_id: 'u2', agent_type: 'be', agent_id: 'a1', tool_input: { file_path: 'C:/x/run.js', old_string: 'a', new_string: 'b\nc' } },
  { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_use_id: 'u2', agent_type: 'be', agent_id: 'a1', tool_response: 'ok' },
  { hook_event_name: 'SubagentStop', agent_type: 'be', agent_id: 'a1', last_assistant_message: 'selesai' },
  { hook_event_name: 'Stop', last_assistant_message: 'Item selesai.' },
];

test('snapshot memuat semua field 1.7.1 setelah urutan event feed', () => {
  const r = mk({ flow: 'run' });
  FEED.forEach((ev) => assert.strictEqual(r.apply(ev), true));
  const s = r.snapshot();
  const V171 = ['nodes', 'main', 'crew', 'crewMeta', 'crewEdges', 'edges', 'expected', 'flow', 'title', 'runId', 'finished', 'prompt', 'log', 'backlog', 'fileList', 'pending', 'convoN', 'skillCalls', 'mainSkills'];
  for (const f of V171) assert.ok(f in s, 'field hilang: ' + f);
  assert.deepStrictEqual([s.flow, s.title, s.prompt, s.finished, s.pending, s.convoN], ['run', 'Run backlog', 'kerjakan item t05a', false, null, 3]);
  assert.deepStrictEqual(s.crew, ['be', 'qa']);
  assert.deepStrictEqual(s.fileList, [{ agent: 'be', path: 'C:/x/run.js', add: 2, del: 1, created: false }]);
  assert.strictEqual(s.nodes.be.status, 'done');
  assert.strictEqual(s.nodes.be.model, 'sonnet');
  assert.strictEqual(s.nodes.qa.status, 'idle'); // langkah wajib tersisa = jeda, tidak ditandai Dilewati
  assert.strictEqual(r.phase, 'running'); // masih dalam debounce
  adv(2100);
  assert.strictEqual(r.phase, 'paused');
  assert.strictEqual(r.id, s.runId);
});

test('dua run tidak berbagi state; id naik monoton dan log/prompt terbawa lewat prev', () => {
  const a = mk(), b = mk({ prev: null });
  a.apply(FEED[0]); a.apply(FEED[1]);
  assert.strictEqual(a.phase, 'running');
  assert.strictEqual(b.phase, 'idle');
  assert.strictEqual(b.snapshot().prompt, '');
  const c = mk({ prev: a, flow: 'run' });
  assert.ok(c.id > a.id);
  assert.strictEqual(c.snapshot().prompt, 'kerjakan item t05a');
  assert.strictEqual(c.snapshot().nodes.be.status, 'idle');
  const d = mk({ prev: a, fresh: true });
  assert.strictEqual(d.snapshot().prompt, '');
});

test('applyForeign hanya memproses pertanyaan dan izin', () => {
  const r = mk();
  assert.strictEqual(r.applyForeign(FEED[3]), false);
  assert.strictEqual(r.snapshot().nodes.be.tools, 0);
  assert.strictEqual(r.applyForeign({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', tool_input: { questions: [{ question: 'Pilih?', options: [{ label: 'A' }] }] } }), true);
  assert.deepStrictEqual([r.snapshot().pending.kind, r.snapshot().pending.text], ['question', 'Pilih?']);
  assert.strictEqual(r.apply({ hook_event_name: 'PostToolUse', tool_name: 'AskUserQuestion', tool_response: 'A' }), true);
  assert.strictEqual(r.snapshot().pending, null);
});

test('row: null bila run kosong; berisi state dan detail setelah ada event', () => {
  const r = mk();
  assert.strictEqual(r.row(), null);
  FEED.slice(0, 6).forEach((ev) => r.apply(ev));
  const row = r.row('D:/proyek');
  assert.deepStrictEqual([row.id, row.project, row.agents_ran, row.finished], [r.id, 'D:/proyek', 1, 0]);
  assert.deepStrictEqual(Object.keys(JSON.parse(row.state).details).sort(), ['__main', 'be']);
  assert.strictEqual(r.detail('be').task, 'ITEM t05a');
  assert.match(r.report(), /^STATUS: /m);
});

test('pending: daftar per pengirim; hilang hanya oleh event non-Notification dari pengirim yang sama', () => {
  const r = mk();
  r.apply({ hook_event_name: 'PermissionRequest', session_id: 's1', agent_type: 'be', agent_id: 'a1', tool_name: 'Bash', tool_input: { command: 'rm x' } });
  r.apply({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'AskUserQuestion', tool_input: { questions: [{ question: 'Pilih?', options: [{ label: 'A' }, { label: 'B' }] }] } });
  assert.deepStrictEqual(r.pending.map((p) => [p.kind, p.sender]), [['permission', 's1:a1'], ['question', 's1:main']]);
  assert.deepStrictEqual(r.pending[1].options, ['A', 'B']);
  assert.strictEqual(r.snapshot().pending.kind, 'permission'); // klien lama: yang pertama
  assert.strictEqual(r.snapshot().pendings.length, 2);
  r.apply({ hook_event_name: 'Notification', session_id: 's1', agent_id: 'a1', message: 'waiting' }); // Notification tidak menghapus
  assert.strictEqual(r.pending.length, 2);
  r.apply({ hook_event_name: 'PostToolUse', session_id: 's1', agent_type: 'be', agent_id: 'a1', tool_name: 'Bash', tool_use_id: 'x', tool_response: 'ok' });
  assert.deepStrictEqual(r.pending.map((p) => p.sender), ['s1:main']);
  assert.notStrictEqual(r.pending[0].key, undefined);
});

test('detail, convo, report per run atas urutan feed lama', () => {
  const r = mk({ flow: 'run' });
  FEED.forEach((ev) => r.apply(ev));
  r.snapshot();
  const d = r.detail('be');
  assert.deepStrictEqual([d.id, d.task, d.result, d.files.map((f) => [f.path, f.add, f.del])], ['be', 'ITEM t05a', 'selesai', [['C:/x/run.js', 2, 1]]]);
  assert.strictEqual(d.events.length, 1);
  assert.strictEqual(r.detail('__convo').convo.map((c) => c.kind).join(), 'user,agent,claude');
  assert.strictEqual(r.detail('__all').files[0].agent, 'be');
  const rep = r.report();
  assert.match(rep, /^# Laporan Flow Viewer/);
  assert.match(rep, /STATUS: (IDLE|JEDA)/);
  assert.match(rep, /FLOW: run \| langkah wajib jalan 1\/2/);
  assert.match(rep, /be: C:\/x\/run\.js \(\+2 -1\)/);
  const r2 = mk(); // run lain tidak berbagi detail
  assert.deepStrictEqual(r2.detail('be').events, []);
});

// ---- t06a: fase run (5.1) dengan jam palsu ----
const P = { hook_event_name: 'UserPromptSubmit', prompt: 'halo', session_id: 's1' };
const STOP = (extra = {}) => ({ hook_event_name: 'Stop', session_id: 's1', last_assistant_message: 'Beres.', ...extra });
const SUB = (r, type, id) => { r.apply({ hook_event_name: 'SubagentStart', agent_type: type, agent_id: id }); r.apply({ hook_event_name: 'SubagentStop', agent_type: type, agent_id: id }); };

test('fase: Stop bersih selesai tepat setelah 2 dtk tanpa event, bukan sebelumnya', () => {
  const r = mk();
  assert.strictEqual(r.phase, 'idle');
  r.apply(P); assert.strictEqual(r.phase, 'running');
  r.apply(STOP());
  adv(1900); assert.strictEqual(r.phase, 'running');
  assert.strictEqual(r.tick(), false);
  adv(200); assert.strictEqual(r.tick(), true);
  assert.deepStrictEqual([r.phase, r.snapshot().finished, r.snapshot().outcome], ['finished', true, 'ok']);
});

test('fase: event apa pun saat debounce menunda hitungan 2 dtk (hook tak berurutan)', () => {
  const r = mk();
  r.apply(P); r.apply(STOP());
  adv(1500);
  r.apply({ hook_event_name: 'Notification', message: 'x', session_id: 's1' });
  adv(1500); assert.strictEqual(r.phase, 'running');
  adv(600); assert.strictEqual(r.phase, 'finished');
});

test('fase: Stop dengan background_tasks berjalan tetap running lama; Stop berikutnya kosong = selesai', () => {
  const r = mk();
  r.apply(P);
  r.apply(STOP({ background_tasks: [{ id: 'b1', status: 'running' }] }));
  adv(60000); assert.strictEqual(r.phase, 'running');
  assert.strictEqual(r.tick(), false);
  r.apply({ hook_event_name: 'UserPromptSubmit', prompt: '<task-notification>b1 selesai</task-notification>', session_id: 's1' });
  r.apply(STOP({ background_tasks: [] }));
  adv(2100); assert.strictEqual(r.phase, 'finished');
});

test('fase: Stop saat agent masih berjalan menunggu agent berhenti, lalu 2 dtk', () => {
  const r = mk();
  r.apply(P);
  r.apply({ hook_event_name: 'SubagentStart', agent_type: 'be', agent_id: 'a1' });
  r.apply(STOP()); adv(5000);
  assert.strictEqual(r.phase, 'running');
  r.apply({ hook_event_name: 'SubagentStop', agent_type: 'be', agent_id: 'a1' });
  adv(1000); assert.strictEqual(r.phase, 'running');
  adv(1100); assert.strictEqual(r.phase, 'finished');
});

test('fase: pesan terakhir berakhir tanda tanya = jeda tanpa pending/Dilewati; prompt melanjutkan run yang sama', () => {
  const r = mk({ flow: 'run' });
  r.apply(P); SUB(r, 'be', 'a1'); SUB(r, 'qa', 'a2');
  r.apply(STOP({ last_assistant_message: 'Lanjut ke item berikutnya?' }));
  adv(2100);
  assert.strictEqual(r.phase, 'paused');
  const s = r.snapshot();
  assert.deepStrictEqual([s.pending, s.finished, s.phase], [null, false, 'paused']);
  assert.ok(r.report().includes('STATUS: JEDA: Lanjut ke item berikutnya?'));
  const id = r.id;
  assert.strictEqual(r.rollover({ ...P, prompt: 'ya' }), false);
  r.apply({ ...P, prompt: 'ya' });
  assert.deepStrictEqual([r.phase, r.id], ['running', id]);
});

test('fase: langkah wajib flow tersisa = jeda walau pesan bukan pertanyaan; selesai setelah semua jalan', () => {
  const r = mk({ flow: 'run' });
  r.apply(P); SUB(r, 'be', 'a1');
  r.apply(STOP()); adv(2100);
  assert.deepStrictEqual([r.phase, r.snapshot().nodes.qa.status], ['paused', 'idle']);
  r.apply({ ...P, prompt: 'lanjut' }); SUB(r, 'qa', 'a2');
  r.apply(STOP()); adv(2100);
  assert.deepStrictEqual([r.phase, r.snapshot().outcome], ['finished', 'ok']);
});

test('fase: node failed saat kandidat akhir = finished gagal', () => {
  const r = mk();
  r.apply(P); r.state.nodes.be.status = 'failed';
  r.apply(STOP()); adv(2100);
  assert.deepStrictEqual([r.phase, r.snapshot().outcome], ['finished', 'failed']);
});

test('run baru: prompt pemilik setelah finished = ya; pesan sistem, prompt saat jalan = tidak; sesi lain = ya', () => {
  const r = mk();
  r.apply(P);
  assert.strictEqual(r.rollover({ ...P, prompt: 'lagi' }), false);
  r.apply(STOP()); adv(2100);
  assert.strictEqual(r.phase, 'finished');
  assert.strictEqual(r.rollover({ ...P, prompt: '<task-notification>x</task-notification>' }), false);
  assert.strictEqual(r.rollover({ ...P, prompt: 'tugas baru' }), true);
  assert.strictEqual(r.rollover({ hook_event_name: 'SessionStart', session_id: 's2' }), true);
  assert.strictEqual(r.rollover({ hook_event_name: 'PreToolUse', session_id: 's2' }), false);
  const r2 = mk({ prev: r });
  assert.ok(r2.id > r.id); assert.strictEqual(r2.phase, 'idle');
});

test('kerja baru sesi utama setelah Stop membatalkan kandidat akhir', () => {
  const r = mk();
  r.apply(P); r.apply(STOP()); adv(1000);
  r.apply({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: 'a.js' }, session_id: 's1' });
  adv(5000); assert.strictEqual(r.phase, 'running');
  r.apply(STOP()); adv(2100); assert.strictEqual(r.phase, 'finished');
});

// ---- t06b: Gagal dan Ringkasan run (5.2, 5.6) ----
const AGENT_PRE = { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'g1', session_id: 's1', tool_input: { subagent_type: 'be', prompt: 'x', description: 'be' } };
const AGENT_POST = (resp) => ({ hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_use_id: 'g1', session_id: 's1', tool_response: resp });

test('gagal: PostToolUse Agent dengan is_error/error/interrupted -> node failed + alasan 1 baris; run finished gagal', () => {
  for (const resp of [{ is_error: true, content: 'boom\nbaris dua' }, { error: 'timeout' }, { interrupted: true }]) {
    const r = mk();
    r.apply(P); r.apply(AGENT_PRE); r.apply(AGENT_POST(resp));
    const n = r.state.nodes.be;
    assert.strictEqual(n.status, 'failed');
    assert.ok(n.failReason.length > 0 && !n.failReason.includes('\n'));
    r.apply(STOP()); adv(2100);
    assert.deepStrictEqual([r.phase, r.snapshot().outcome, r.snapshot().summary.failedAgent], ['finished', 'failed', 'be']);
  }
  const r = mk(); r.apply(P); r.apply(AGENT_PRE); r.apply(AGENT_POST({ error: 'timeout' }));
  assert.strictEqual(r.state.nodes.be.failReason, 'timeout');
});

test('gagal: tool biasa (Bash) error tidak membuat node gagal; agent mulai lagi menghapus alasan', () => {
  const r = mk(); r.apply(P);
  r.apply({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'b1', session_id: 's1', tool_input: { command: 'x' } });
  r.apply({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_use_id: 'b1', session_id: 's1', tool_response: { is_error: true } });
  assert.ok(Object.values(r.state.nodes).every((n) => n.status !== 'failed'));
  r.apply(AGENT_PRE); r.apply(AGENT_POST({ error: 'x' }));
  assert.strictEqual(r.state.nodes.be.status, 'failed');
  r.apply({ ...AGENT_PRE, tool_use_id: 'g2' });
  assert.deepStrictEqual([r.state.nodes.be.status, r.state.nodes.be.failReason], ['running', '']);
});

test('gagal: item backlog status failed -> run finished gagal, langkah di ringkasan dengan alasan dari backlog', () => {
  const r = mk({ backlog: () => ({ items: [{ id: 't9', status: 'failed', lastFailure: 'tes merah' }, { id: 't1', status: 'done' }], decisions: [] }) });
  r.apply(P); r.apply(STOP()); adv(2100);
  const s = r.snapshot();
  assert.strictEqual(s.outcome, 'failed');
  assert.deepStrictEqual(s.summary.steps[0], { id: 't9', status: 'failed', reason: 'tes merah', source: 'backlog' });
});

test('ringkasan: tanpa agent dan tanpa file -> auto false; hanya ada saat finished', () => {
  const r = mk(); r.apply(P);
  assert.strictEqual(r.snapshot().summary, null);
  r.apply(STOP()); adv(2100);
  const m = r.snapshot().summary;
  assert.deepStrictEqual([m.auto, m.result, m.files, m.failedAgent], [false, 'ok', [], '']);
});

test('ringkasan: agent jalan + file berubah + dilewati/selesai, token, durasi, banding, keputusan', () => {
  const dec = [{ id: 't12', title: 'Pilih arah', question: 'A atau B?', status: 'ready' }];
  const r = mk({ flow: 'run', compare: { eq: 100, durMs: 1000 }, backlog: () => ({ items: [], decisions: dec }) });
  FEED.forEach((ev) => r.apply(ev));
  r.state.nodes.be.usage = { in: 100, out: 10, cr: 0, cc: 0 }; // eq = 100 + 10*5 = 150
  r.state.nodes.qa.count = 1; r.state.nodes.qa.status = 'done'; // langkah wajib terpenuhi
  r.apply(STOP()); adv(2100);
  const m = r.snapshot().summary;
  assert.strictEqual(m.auto, true);
  assert.strictEqual(m.result, 'ok');
  assert.deepStrictEqual(m.steps.map((x) => [x.id, x.status]), [['be', 'done'], ['qa', 'done']]);
  assert.deepStrictEqual(m.tokens, { eq: 150, prevEq: 100, deltaPct: 50 });
  assert.deepStrictEqual(m.files, [{ agent: 'be', path: 'C:/x/run.js', add: 2, del: 1, created: false }]);
  assert.deepStrictEqual(m.decisions, [{ kind: 'decision', id: 't12', title: 'Pilih arah', text: 'A atau B?' }]);
  assert.ok(m.durMs > 0 && m.prev.eq === 100 && m.prev.durMs === 1000);
});

test('ringkasan: langkah wajib dilewati tampil di atas; prompt baru menghapus ringkasan', () => {
  const r = mk({ flow: 'run' });
  r.apply(P); r.state.nodes.be.count = 1; r.state.nodes.be.status = 'done';
  r.state.nodes.qa.optional = false; r.state.nodes.qa.count = 0;
  r.apply(STOP({ last_assistant_message: 'Selesai.' })); adv(2100);
  assert.strictEqual(r.phase, 'paused'); // langkah wajib belum jalan = jeda, bukan ringkasan
  assert.strictEqual(r.snapshot().summary, null);
});
