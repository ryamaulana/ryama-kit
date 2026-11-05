// Seam 1: createActivityTracker (stream.ts) diberi baris stream-json fixture -> baris agent_activity + langkah alat.
// Seam 2: Store.saveActivity / addTool -> event SSE `activity` dan `tool` sah menurut kontrak, masukan tidak dipangkas.
// Seam 3: Harness dengan claude tiruan yang memutar fixture asli -> agent_activity tersimpan, tim dicocokkan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivityTracker } from '../src/harness/stream.js';
import { Store } from '../src/store/index.js';
import { RunEvent } from '../src/contract/index.js';
import { setupHarness, tmpProject, waitFor } from './helpers.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'stream');
const lines = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const zero = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

function feedAll(msgs: any[], team: string[] | null, prior: any[] = []) {
  const tr = createActivityTracker({ runId: 'r1', sessionId: 's1', teamAgents: team, prior });
  const acts = new Map<string, any>();
  const tools: any[] = [];
  for (const m of msgs) {
    const o = tr.feed(m);
    o.activities.forEach((a) => acts.set(a.id, a));
    tools.push(...o.tools);
  }
  return { tr, acts, tools };
}

test('fixture asli (subagent latar): agent di luar tim, selesai dari task_*, bukan dari tool_result "Async agent launched"', () => {
  const msgs = lines('subagent-background-haiku.jsonl');
  const cut = msgs.findIndex((m) => m.subtype === 'task_updated');
  const before = feedAll(msgs.slice(0, cut), ['fe', 'be']);
  assert.equal(before.acts.get('toolu_01CxpQSrWDJNTUP4iyWddgt9')?.status, 'running');

  const { acts, tools } = feedAll(msgs, ['fe', 'be']);
  assert.equal(acts.size, 1);
  const a = acts.get('toolu_01CxpQSrWDJNTUP4iyWddgt9');
  assert.equal(a.agent, 'general-purpose');
  assert.equal(a.inTeam, false);
  assert.equal(a.status, 'done');
  assert.equal(a.round, 1);
  assert.equal(a.toolCount, 1);
  assert.equal(a.modelUsed, 'claude-haiku-5-5');
  assert.equal(a.runId, 'r1');
  assert.equal(a.sessionId, 's1');
  assert.ok(a.endedAt);

  const agentStep = tools.find((t) => t.toolUseId === 'toolu_01CxpQSrWDJNTUP4iyWddgt9' && t.status === 'running');
  assert.equal(agentStep.agent, 'orkestrator');
  assert.equal(agentStep.name, 'Agent');
  const bash = tools.filter((t) => t.toolUseId === 'toolu_01RNvBT52QpXRH4Ysrji3cCD');
  assert.deepEqual(bash.map((t) => t.status), ['running', 'done']);
  assert.ok(bash.every((t) => t.agent === 'general-purpose' && t.subagent === true && t.name === 'Bash'));
  assert.deepEqual(bash[0].input, { command: 'echo hai', description: 'Print hai via echo' });
  assert.equal(bash[1].result, 'hai');
});

test('fixture sintetis: Task latar depan, putaran, alat, file, token, item, gagal, agent dari task_started', () => {
  const msgs = lines('subagent-foreground-sintetis.jsonl');
  msgs[1].message.content[0].input.content = 'x'.repeat(50000); // masukan besar harus utuh
  const { acts, tools } = feedAll(msgs, ['fe', 'be']);
  const t1 = acts.get('T1');
  assert.deepEqual(
    { agent: t1.agent, inTeam: t1.inTeam, itemKey: t1.itemKey, round: t1.round, status: t1.status, toolCount: t1.toolCount, files: t1.files, modelUsed: t1.modelUsed, tokens: t1.tokens },
    { agent: 'be', inTeam: true, itemKey: 'lp02-x', round: 1, status: 'done', toolCount: 2, files: ['src/a.ts'], modelUsed: 'claude-sonnet-x', tokens: { input: 10, output: 4, cacheRead: 100, cacheWrite: 20 } },
  );
  const t2 = acts.get('T2');
  assert.deepEqual({ agent: t2.agent, round: t2.round, status: t2.status, toolCount: t2.toolCount, itemKey: t2.itemKey }, { agent: 'be', round: 2, status: 'failed', toolCount: 0, itemKey: null });
  const t3 = acts.get('T3');
  assert.deepEqual({ agent: t3.agent, inTeam: t3.inTeam, round: t3.round, status: t3.status, toolCount: t3.toolCount }, { agent: 'Explore', inTeam: false, round: 1, status: 'failed', toolCount: 4 });

  const write = tools.filter((t) => t.toolUseId === 'W1');
  assert.equal(write[0].input.content.length, 50000);
  assert.deepEqual(write.map((t) => [t.agent, t.status]), [['be', 'running'], ['be', 'done']]);
  assert.equal(write[1].result, 'ok');
  const edit = tools.filter((t) => t.toolUseId === 'E1');
  assert.deepEqual(edit.map((t) => t.status), ['running', 'failed']);
  assert.ok(tools.every((t) => typeof t.at === 'string'));
});

test('putaran melanjutkan aktivitas sebelumnya di run yang sama; end() menandai yang masih jalan sebagai gagal', () => {
  const prior = [{ id: 'old', runId: 'r1', sessionId: 's0', agent: 'be', inTeam: true, itemKey: null, round: 3, status: 'done', startedAt: 'x', endedAt: 'x', modelUsed: null, toolCount: 0, files: [], tokens: zero }];
  const msgs = lines('subagent-foreground-sintetis.jsonl').slice(0, 2);
  const { tr, acts } = feedAll(msgs, ['be'], prior);
  assert.equal(acts.get('T1').round, 4);
  assert.equal(acts.get('T1').status, 'running');
  const ended = tr.end();
  assert.deepEqual(ended.map((a) => [a.id, a.status]), [['T1', 'failed']]);
  assert.ok(ended[0].endedAt);
  assert.deepEqual(tr.end(), []);
});

test('tanpa tim: semua agent in_team=false', () => {
  const { acts } = feedAll(lines('subagent-foreground-sintetis.jsonl').slice(0, 1), null);
  assert.equal(acts.get('T1').inTeam, false);
});

test('Store: saveActivity dan addTool menjadi event SSE sah menurut kontrak, data utuh', () => {
  const store = new Store(':memory:');
  const a = { id: 'T1', runId: 'r1', sessionId: 's1', agent: 'be', inTeam: true, itemKey: 'lp02-x', round: 1, status: 'running' as const, startedAt: '2026-11-05T00:00:00.000Z', endedAt: null, modelUsed: null, toolCount: 0, files: [], tokens: zero };
  store.saveActivity(a);
  store.saveActivity({ ...a, status: 'done', toolCount: 2 });
  const big = 'y'.repeat(100000);
  store.addTool('r1', { name: 'Write', summary: 'src/a.ts', subagent: true, at: '2026-11-05T00:00:01.000Z', agent: 'be', toolUseId: 'W1', input: { file_path: 'src/a.ts', content: big }, status: 'running' });
  const ev = store.eventsAfter('r1', 0).map((e) => RunEvent.parse(e));
  assert.deepEqual(ev.map((e) => e.type), ['activity', 'activity', 'tool']);
  assert.equal((ev[1].data as any).status, 'done');
  assert.equal((ev[2].data as any).input.content.length, 100000);
  assert.equal((ev[2].data as any).agent, 'be');
  assert.equal(store.listActivities('r1').length, 1);
});

test('Harness: fixture asli lewat claude tiruan -> agent_activity tersimpan dan event activity/tool terkirim', async (t) => {
  const h = await setupHarness(); t.after(h.close);
  h.harness.teamAgentsOf = (teamId) => (teamId === 'tim' ? ['general-purpose'] : null);
  const { dir: p } = tmpProject();
  const r = h.harness.startRun({ projectDir: p, prompt: '[subagent]', meta: { teamId: 'tim' } });
  await waitFor(() => h.store.listActivities(r.id)[0]?.status === 'done', 8000, 'agent selesai');
  const [a] = h.store.listActivities(r.id);
  assert.equal(a.agent, 'general-purpose');
  assert.equal(a.inTeam, true);
  assert.equal(a.sessionId, r.sessionId);
  const ev = h.store.eventsAfter(r.id, 0);
  assert.ok(ev.some((e) => e.type === 'activity'));
  assert.ok(ev.some((e) => e.type === 'tool' && (e.data as any).agent === 'general-purpose' && (e.data as any).result === 'hai'));
});
