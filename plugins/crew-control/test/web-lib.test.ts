// Logika murni tampilan: web/src/app/lib/ (PRD F4, F5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, emptyState, allowedActions } from '../web/src/app/lib/runState.js';
import { formatTokens, formatDuration, countTokens } from '../web/src/app/lib/format.js';
import { chatItems } from '../web/src/app/lib/chatItems.js';
import { agentStates } from '../web/src/app/lib/agentStates.js';
import { railLayout } from '../web/src/app/lib/railLayout.js';

const any = (x: unknown) => x as any;

test('applyEvent: pesan dan activity diganti per id, run diganti, tool ditambah', () => {
  let s = emptyState();
  s = applyEvent(s, { type: 'message', data: any({ id: 'a', state: 'pending' }) });
  s = applyEvent(s, { type: 'message', data: any({ id: 'b', state: null }) });
  s = applyEvent(s, { type: 'message', data: any({ id: 'a', state: 'answered' }) });
  assert.deepEqual(s.messages.map((m) => `${m.id}:${m.state}`), ['a:answered', 'b:null']);
  s = applyEvent(s, { type: 'activity', data: any({ id: 'x', status: 'running' }) });
  s = applyEvent(s, { type: 'activity', data: any({ id: 'x', status: 'done' }) });
  s = applyEvent(s, { type: 'run', data: any({ status: 'done' }) });
  s = applyEvent(s, { type: 'tool', data: any({ name: 'Write' }) });
  assert.equal(s.run?.status, 'done');
  assert.equal(s.tools.length, 1);
  assert.deepEqual(s.activities.map((a) => a.status), ['done']);
});

test('allowedActions: Jeda saat jalan, Lanjut saat dijeda, run berakhir hanya boleh pesan bila punya sesi', () => {
  assert.deepEqual(allowedActions('running'), { pause: true, resume: false, stop: true, message: true });
  assert.deepEqual(allowedActions('paused'), { pause: false, resume: true, stop: true, message: true });
  assert.equal(allowedActions('done', 'sess-1').message, true);
  assert.equal(allowedActions('failed', null).message, false);
});

test('format: token id-ID ringkas dan countTokens tanpa cache baca', () => {
  assert.equal(formatTokens(78400), '78,4 rb');
  assert.equal(formatTokens(950), '950');
  assert.equal(formatDuration(45_000), '45 dtk');
  assert.equal(formatDuration(125_000), '2 mnt 5 dtk');
  assert.equal(formatDuration(3_900_000), '1 j 5 mnt');
  assert.equal(countTokens({ input: 10, output: 20, cacheWrite: 5 }), 35);
});

const msg = (id: string, kind: string, state: string | null, at: string, answer: unknown = null) =>
  any({ id, runId: 'r', kind, text: '', createdAt: at, state, answer, questions: null, tool: null, answeredAt: null, sentOnResume: false });
const tool = (name: string, at: string) => any({ name, summary: name, subagent: false, at });

test('chatItems: langkah alat berurutan digabung, kartu terjawab ringkas, urut waktu', () => {
  const items = chatItems(
    [msg('m1', 'agent', null, '2026-01-01T00:00:00Z'),
     msg('q1', 'question', 'answered', '2026-01-01T00:00:05Z', { from: 'dashboard', answers: { 'Warna?': 'Biru' }, decision: null, reason: null }),
     msg('p1', 'permission', 'pending', '2026-01-01T00:00:09Z'),
     msg('p0', 'permission', 'answered', '2026-01-01T00:00:08Z', { from: 'dashboard', answers: null, decision: 'deny', reason: 'jangan' })],
    [tool('Read', '2026-01-01T00:00:01Z'), tool('Write', '2026-01-01T00:00:02Z'), tool('Bash', '2026-01-01T00:00:06Z')],
  );
  assert.deepEqual(items.map((i) => i.type), ['message', 'steps', 'card', 'steps', 'card', 'card']);
  assert.equal(any(items[1]).tools.length, 2);
  assert.equal(any(items[2]).summary, 'Warna? → Biru');
  assert.equal(any(items[4]).summary, 'Ditolak: jangan');
  assert.equal(any(items[5]).status, 'pending');
});

const FLOW = {
  nodes: ['prd', 'ux', 'architect', 'backlog', 'ui-designer', 'fe', 'be', 'ui-critic', 'qa', 'cyber'],
  edges: [['prd', 'ux'], ['ux', 'architect'], ['architect', 'backlog'], ['backlog', 'ui-designer'], ['ui-designer', 'fe'],
    ['ui-designer', 'be'], ['fe', 'ui-critic'], ['be', 'qa'], ['ui-critic', 'qa'], ['qa', 'cyber']] as [string, string][],
};
const team = (ids: string[], flow = FLOW) => any({
  id: 't', name: 'T', valid: true, commands: [], orchestrator: { id: 'o', label: 'O' }, milestoneKinds: [], flow,
  agents: ids.map((id) => ({ id, name: id, role: '', model: null, skills: [], tools: [] })),
});
const act = (agent: string, status: string, round = 1, inTeam = true) =>
  ({ id: `${agent}${round}`, agent, inTeam, round, status: status as any, startedAt: `2026-01-01T00:00:0${round}Z` });

test('agentStates: enam status dan urutan Butuh kamu, Gagal, Jalan, lalu menurut alur', () => {
  const t = team(FLOW.nodes);
  const rows = agentStates(t, [act('prd', 'done'), act('ux', 'done'), act('architect', 'failed'), act('backlog', 'running'), act('ui-designer', 'running')],
    [any({ kind: 'question', state: 'pending', agent: 'ui-designer' })], any({ status: 'needs_owner' }));
  const by = Object.fromEntries(rows.map((r) => [r.id, r.status]));
  assert.deepEqual([by.prd, by.architect, by.backlog, by['ui-designer'], by.fe], ['done', 'failed', 'running', 'needs_owner', 'idle']);
  assert.deepEqual(rows.map((r) => r.id), ['ui-designer', 'architect', 'backlog', 'prd', 'ux', 'fe', 'be', 'ui-critic', 'qa', 'cyber']);
  assert.equal(agentStates(t, [act('prd', 'done')], [], any({ status: 'done' })).find((r) => r.id === 'fe')?.status, 'skipped');
});

test('agentStates: agent di luar tim ikut tampil terakhir, putaran = putaran terbanyak', () => {
  const rows = agentStates(team(['prd', 'ux']), [act('ux', 'done', 1), act('ux', 'running', 3), act('tamu', 'done', 2, false)], [], any({ status: 'running' }));
  assert.deepEqual(rows.map((r) => [r.id, r.inTeam, r.round]), [['ux', true, 3], ['prd', true, 0], ['tamu', false, 2]]);
});

const overlap = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
test('railLayout: simpul tidak saling menimpa untuk alur tim dan 12 agent, pada beberapa lebar', () => {
  const ids = Array.from({ length: 12 }, (_, i) => `a${i}`);
  const twelve = { nodes: ids, edges: ids.slice(1).map((id, i) => [ids[i]!, id] as [string, string]).concat([['a2', 'a5'], ['a1', 'a9']]) };
  for (const flow of [FLOW, twelve, { nodes: ids, edges: [] }])
    for (const width of [320, 900, 2400]) {
      const { nodes } = railLayout(flow, width);
      assert.equal(nodes.length, flow.nodes.length);
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) assert.ok(!overlap(nodes[i], nodes[j]), `${nodes[i]!.id}/${nodes[j]!.id} @${width}`);
      assert.ok(nodes.every((n) => n.x >= 0 && n.y >= 0 && n.x + n.w <= Math.max(width, 168)), `muat lebar ${width}`);
    }
  assert.doesNotThrow(() => railLayout({ nodes: ['a', 'b'], edges: [['a', 'b'], ['b', 'a']] }, 900));
});

import { parseTheme, applyTheme } from '../web/src/app/lib/theme.js';
import { destForPath, isSoon } from '../web/src/app/lib/nav.js';
import { api, ApiError } from '../web/src/app/api.js';

test('parseTheme: kunjungan pertama atau nilai asing = ikut sistem; light/dark diingat', () => {
  assert.equal(parseTheme(null), 'system');
  assert.equal(parseTheme('biru'), 'system');
  assert.equal(parseTheme('dark'), 'dark');
  assert.equal(parseTheme('light'), 'light');
});

test('applyTheme: system menghapus atribut, selain itu memasangnya', () => {
  const attrs = new Map<string, string>();
  const root = { setAttribute: (k: string, v: string) => void attrs.set(k, v), removeAttribute: (k: string) => void attrs.delete(k) };
  applyTheme(root, 'dark');
  assert.equal(attrs.get('data-theme'), 'dark');
  applyTheme(root, 'system');
  assert.equal(attrs.has('data-theme'), false);
});

test('rel: Riwayat dan Kesehatan kit bertanda segera; destForPath memetakan rute UX 4', () => {
  assert.equal(isSoon('riwayat'), true);
  assert.equal(isSoon('kesehatan'), true);
  assert.equal(isSoon('baru'), false);
  assert.equal(isSoon('proyek'), false);
  assert.equal(destForPath('/'), 'proyek');
  assert.equal(destForPath('/proyek/abc/review'), 'proyek');
  assert.equal(destForPath('/riwayat/banding'), 'riwayat');
  assert.equal(destForPath('/nyasar'), null);
});

test('api: galat seragam jadi ApiError; jaringan putus jadi network; sukses mengembalikan isi', async () => {
  const real = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { code: 'project_busy', message: 'Sibuk', details: { activeRunId: 'r1' } } }), { status: 409 })) as typeof fetch;
    await assert.rejects(api('POST', '/api/x'), (e: ApiError) => e instanceof ApiError && e.status === 409 && e.code === 'project_busy' && e.details?.activeRunId === 'r1');
    globalThis.fetch = (async () => { throw new TypeError('down'); }) as typeof fetch;
    await assert.rejects(api('GET', '/api/x'), (e: ApiError) => e.code === 'network');
    globalThis.fetch = (async () => new Response(JSON.stringify({ ok: true }))) as typeof fetch;
    assert.deepEqual(await api('GET', '/api/health'), { ok: true });
  } finally { globalThis.fetch = real; }
});
