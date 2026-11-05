// Seam: HTTP + SSE (kontrak API). Keamanan, validasi, galat seragam, lalu alur ujung ke ujung lewat jaringan sungguhan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { FreeFlow } from '../src/conductor/free-flow.js';
import { Harness } from '../src/harness/index.js';
import { createApp } from '../src/server.js';
import { Store } from '../src/store/index.js';
import { ApiError, RunEvent } from '../src/contract/index.js';
import { FAKE, tmpProject, waitFor } from './helpers.js';

async function freePort() {
  const s = http.createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const port = (s.address() as { port: number }).port;
  await new Promise((r) => s.close(r));
  return port;
}

async function setup() {
  const { root, dir } = tmpProject('app');
  const store = new Store(':memory:');
  const port = await freePort();
  const harness = new Harness({
    store, hookBaseUrl: `http://127.0.0.1:${port}`, bin: process.execPath, binArgs: [FAKE], maxRuns: 1,
  });
  new FreeFlow({ harness, graceMs: 150 });
  const teamDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-teams-'));
  const plug = path.join(teamDir, 'tiruan');
  fs.cpSync(path.join(import.meta.dirname, 'fixtures/teams/tiruan'), plug, { recursive: true });
  const mf = JSON.parse(fs.readFileSync(path.join(plug, 'crew/team.json'), 'utf8'));
  mf.commands.push({ id: 'backlog', label: 'Jalankan backlog', kind: 'backlog', template: '/backlog run {batchSize}', needsText: false, placeholder: 'Opsional' });
  fs.writeFileSync(path.join(plug, 'crew/team.json'), JSON.stringify(mf));
  const app = createApp({ store, harness, workRoot: root, maxRuns: 1, teamDirs: [teamDir] });
  await app.listen({ port, host: '127.0.0.1' });
  const base = `http://127.0.0.1:${port}`;
  const api = async (method: string, url: string, body?: unknown) => {
    const r = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(method === 'POST' && url === '/api/runs' ? { teamId: 'tiruan', commandId: 'bebas', ...(body as object) } : body) });
    return { status: r.status, body: (await r.json()) as any };
  };
  const events: RunEvent[] = [];
  const watch = (runId: string, after = 0) => {
    const ac = new AbortController();
    (async () => {
      const r = await fetch(`${base}/api/runs/${runId}/events?after=${after}`, { signal: ac.signal });
      assert.match(r.headers.get('content-type')!, /text\/event-stream/);
      const dec = new TextDecoder();
      let buf = '';
      for await (const chunk of r.body as any) {
        buf += dec.decode(chunk, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const id = /^id: (\d+)$/m.exec(block)?.[1], type = /^event: (\w+)$/m.exec(block)?.[1], data = /^data: (.*)$/m.exec(block)?.[1];
          if (id && type && data) events.push(RunEvent.parse({ seq: +id, runId, at: '', type, data: JSON.parse(data) }));
        }
      }
    })().catch(() => {});
    return () => ac.abort();
  };
  const close = async () => { harness.shutdown(); await app.close(); };
  return { root, dir, store, app, api, events, watch, close, base };
}

test('keamanan: peer, Host, Origin, Content-Type', async (t) => {
  const s = await setup(); t.after(s.close);
  const hdr = { host: 'localhost:4780' };
  const get = (o: object) => s.app.inject({ method: 'GET', url: '/api/health', ...o });
  assert.equal((await get({ headers: hdr })).statusCode, 200);
  assert.equal((await get({ headers: hdr, remoteAddress: '100.101.102.103' })).statusCode, 200); // Tailscale
  assert.equal((await get({ headers: { host: 'laptop.tail1234.ts.net' }, remoteAddress: '100.101.102.103' })).statusCode, 200);
  for (const remoteAddress of ['8.8.8.8', '192.168.1.20', '100.128.0.1', '10.0.0.5']) {
    const r = await get({ headers: hdr, remoteAddress });
    assert.equal(r.statusCode, 403, remoteAddress);
    assert.equal(r.json().error.code, 'forbidden_peer');
  }
  assert.equal((await get({ headers: { host: 'evil.example.com' } })).json().error.code, 'forbidden_host'); // DNS rebinding
  const post = (headers: object) => s.app.inject({ method: 'POST', url: '/api/runs/x/stop', payload: '{}', headers: { host: 'localhost:4780', 'content-type': 'application/json', ...headers } });
  assert.equal((await post({ origin: 'http://evil.example.com' })).json().error.code, 'forbidden_origin');
  assert.equal((await post({ origin: 'http://localhost:4780' })).json().error.code, 'not_found'); // lolos keamanan, run tidak ada
  assert.equal((await post({ 'content-type': 'text/plain' })).statusCode, 415);
  assert.equal((await post({ 'sec-fetch-site': 'cross-site' })).statusCode, 403);
  // hook claude hanya dari loopback, bukan dari peer Tailscale
  const hook = await s.app.inject({ method: 'POST', url: '/hook/abc', payload: '{}', headers: { host: 'localhost:4780', 'content-type': 'application/json' }, remoteAddress: '100.101.102.103' });
  assert.equal(hook.statusCode, 403);
});

test('validasi batas: folder di luar folder kerja, input rusak, galat seragam tanpa stack', async (t) => {
  const s = await setup(); t.after(s.close);
  const bad = async (body: unknown, status: number, code: string) => {
    const r = await s.api('POST', '/api/runs', body);
    assert.equal(r.status, status, JSON.stringify(r.body));
    assert.equal(ApiError.parse(r.body).error.code, code);
    assert.ok(!JSON.stringify(r.body).includes(' at '), 'tanpa stack');
  };
  await bad({ project: path.dirname(s.root), prompt: 'x' }, 400, 'project_outside_root');
  await bad({ project: path.join(s.dir, '..', '..'), prompt: 'x' }, 400, 'project_outside_root');
  await bad({ project: s.root + '-evil', prompt: 'x' }, 400, 'project_not_found');
  await bad({ project: 'app', prompt: 'x' }, 400, 'invalid_project');
  await bad({ project: path.join(s.root, 'tidak-ada'), prompt: 'x' }, 400, 'project_not_found');
  await bad({ project: s.dir }, 400, 'invalid_request');
  await bad({ project: s.dir, prompt: '   ' }, 400, 'command_needs_text');
  await bad({ project: s.dir, prompt: 'x', model: 'a b; rm -rf' }, 400, 'invalid_request');
  await bad({ project: s.dir, prompt: 'x', model: 'gpt-5' }, 400, 'invalid_request'); // bukan dari daftar
  await bad({ project: s.dir, prompt: 'x', ekstra: 1 }, 400, 'invalid_request');
  const nf = await s.api('GET', '/api/runs/tidak-ada');
  assert.equal(nf.status, 404);
  assert.equal(ApiError.parse(nf.body).error.code, 'not_found');
  assert.equal((await s.api('GET', '/api/tidak-ada')).status, 404);
  const cfg = await s.api('GET', '/api/config');
  assert.deepEqual(cfg.body.projects.map((p: any) => p.name), ['app']);
  assert.equal((await s.api('GET', '/api/folders?path=' + encodeURIComponent(path.dirname(s.root)))).status, 400);
});

test('folder: jelajah bertahap lewat HTTP, akar boleh jadi proyek, kedalaman bebas, keluar akar ditolak', async (t) => {
  const s = await setup(); t.after(s.close);
  fs.mkdirSync(path.join(s.dir, 'lv2', 'lv3'), { recursive: true });
  const top = await s.api('GET', '/api/folders');
  assert.equal(top.status, 200);
  assert.equal(top.body.isRoot, true);
  assert.equal(top.body.parent, null);
  assert.deepEqual(top.body.folders.map((f: any) => f.name), ['app']);
  const lv2 = await s.api('GET', '/api/folders?path=' + encodeURIComponent(path.join(s.dir, 'lv2')));
  assert.deepEqual(lv2.body.folders.map((f: any) => f.name), ['lv3']);
  assert.equal(lv2.body.parent, s.dir);
  for (const p of [path.dirname(s.root), path.join(s.root, '..'), 'relatif']) {
    const r = await s.api('GET', '/api/folders?path=' + encodeURIComponent(p));
    assert.equal(r.status, 400, p);
    assert.match(ApiError.parse(r.body).error.code, /project_outside_root|invalid_project/);
  }
  // akar dan folder tiga tingkat sama-sama bisa dijadikan proyek
  const deep = await s.api('POST', '/api/runs', { project: path.join(s.dir, 'lv2', 'lv3'), prompt: '[ok]' });
  assert.equal(deep.status, 201);
  await waitFor(() => s.store.getRun(deep.body.id)?.status === 'done');
  const rootRun = await s.api('POST', '/api/runs', { project: s.root, prompt: '[ok]' });
  assert.equal(rootRun.status, 201);
  await waitFor(() => s.store.getRun(rootRun.body.id)?.status === 'done');
});

test('model: daftar dan bawaan dari server; run memakai pilihan atau bawaan', async (t) => {
  const s = await setup(); t.after(s.close);
  const cfg = await s.api('GET', '/api/config');
  assert.deepEqual(cfg.body.models.map((m: any) => m.id), ['opus', 'sonnet', 'haiku']);
  assert.equal(cfg.body.defaultModel, 'sonnet');
  const a = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[ok]' });
  assert.equal(a.body.model, 'sonnet');
  await waitFor(() => s.store.getRun(a.body.id)?.status === 'done');
  const b = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[ok]', model: 'haiku' });
  assert.equal(b.body.model, 'haiku');
});

test('chat berkelanjutan lewat HTTP: pesan ke run yang sudah selesai melanjutkan sesi; folder di luar akar ditolak', async (t) => {
  const s = await setup(); t.after(s.close);
  const start = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[ok]', model: 'haiku' });
  const id = start.body.id;
  await waitFor(() => s.store.getRun(id)?.status === 'done');
  const r = await s.api('POST', `/api/runs/${id}/messages`, { text: 'pesan susulan' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.kind, 'owner');
  await waitFor(() => s.store.getRun(id)?.status === 'done' && s.store.listMessages(id).some((m) => m.text.startsWith(`lanjut:${s.store.getRun(id)!.sessionId}:pesan susulan:haiku`)), 8000, 'giliran lanjutan');
  const detail = await s.api('GET', `/api/runs/${id}`);
  assert.equal(detail.body.run.status, 'done');
  // run yang tidak ada tetap 404
  assert.equal((await s.api('POST', '/api/runs/tidak-ada/messages', { text: 'x' })).status, 404);
});

test('ujung ke ujung: Run baru -> event live -> pertanyaan dijawab dari Chat -> selesai; SSE bisa disambung ulang', async (t) => {
  const s = await setup(); t.after(s.close);
  const start = await s.api('POST', '/api/runs', { project: s.dir, prompt: 'coba [tanya]' });
  assert.equal(start.status, 201);
  assert.equal(start.body.status, 'running');
  const runId = start.body.id;
  const stopWatch = s.watch(runId);

  const q = await waitFor(() => s.events.find((e) => e.type === 'message' && e.data.kind === 'question'), 8000, 'event pertanyaan');
  assert.equal(q.type === 'message' && q.data.questions![0].question, 'Warna favorit?');
  await waitFor(() => s.events.some((e) => e.type === 'run' && e.data.status === 'needs_owner'), 8000, 'needs_owner');

  const bad = await s.api('POST', `/api/runs/${runId}/messages/${(q.data as any).id}/answer`, { kind: 'question', answers: { 'Warna favorit?': '' } });
  assert.equal(bad.status, 400);
  const good = await s.api('POST', `/api/runs/${runId}/messages/${(q.data as any).id}/answer`, { kind: 'question', answers: { 'Warna favorit?': 'Biru' } });
  assert.equal(good.status, 200);
  assert.equal(good.body.state, 'answered');
  const second = await s.api('POST', `/api/runs/${runId}/messages/${(q.data as any).id}/answer`, { kind: 'question', answers: { 'Warna favorit?': 'Merah' } });
  assert.equal(second.status, 409);
  assert.equal(second.body.error.code, 'already_answered');

  await waitFor(() => s.events.some((e) => e.type === 'run' && e.data.status === 'done'), 8000, 'run selesai');
  assert.equal(fs.readFileSync(path.join(s.dir, 'jawaban.txt'), 'utf8'), 'Biru');
  const seqs = s.events.map((e) => e.seq);
  assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
  assert.equal(new Set(seqs).size, seqs.length);
  stopWatch();

  // sambung ulang dengan ?after: hanya event setelahnya
  const detail = await s.api('GET', `/api/runs/${runId}`);
  assert.equal(detail.body.run.status, 'done');
  assert.ok(detail.body.messages.some((m: any) => m.kind === 'system' && m.text === 'Run selesai.'));
  const lastSeq = seqs.at(-1)!;
  const before = s.events.length;
  const stop2 = s.watch(runId, lastSeq - 1);
  await waitFor(() => s.events.length > before, 4000, 'replay sebagian');
  assert.equal(s.events.length - before, 1);
  stop2();
  const list = await s.api('GET', '/api/runs');
  assert.equal(list.body.runs.length, 1);
});

test('Jeda/Lanjut/Stop lewat HTTP, satu run aktif per proyek ditolak dengan tautan ke run aktif', async (t) => {
  const s = await setup(); t.after(s.close);
  const start = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[stop]' });
  const id = start.body.id;
  const dup = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[ok]' });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'project_busy');
  assert.equal(dup.body.error.details.activeRunId, id);

  assert.equal((await s.api('POST', `/api/runs/${id}/pause`, {})).body.status, 'paused');
  assert.equal((await s.api('POST', `/api/runs/${id}/pause`, { x: 1 })).status, 400);
  assert.equal((await s.api('POST', `/api/runs/${id}/resume`, {})).body.status, 'running');
  const msg = await s.api('POST', `/api/runs/${id}/messages`, { text: 'halo' });
  assert.equal(msg.status, 201);
  assert.equal(msg.body.kind, 'owner');

  await s.api('POST', `/api/runs/${id}/stop`, {});
  await waitFor(() => s.store.getRun(id)!.status === 'stopped', 10000, 'stopped');
  assert.equal((await s.api('POST', `/api/runs/${id}/pause`, {})).body.error.code, 'run_not_active');
});

test('teks agent apa adanya (tanpa diubah) dan dikirim sebagai JSON + nosniff', async (t) => {
  const s = await setup(); t.after(s.close);
  const { body } = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[html]' });
  await waitFor(() => s.store.getRun(body.id)!.status === 'done', 8000);
  const r = await fetch(`${s.base}/api/runs/${body.id}`);
  assert.match(r.headers.get('content-type')!, /application\/json/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  const d: any = await r.json();
  assert.equal(d.messages.find((m: any) => m.kind === 'agent').text, '<img src=x onerror=alert(1)> **tebal**');
});

test('folders: POST membuat folder (git init), project muncul, galat seragam', async (t) => {
  const s = await setup(); t.after(s.close);
  const top = await s.api('GET', '/api/folders');
  assert.equal(top.body.project, null);
  assert.equal(top.body.folders[0].activeRunId, null);
  const made = await s.api('POST', '/api/folders', { parent: s.dir, name: 'baru' });
  assert.equal(made.status, 201);
  assert.equal(made.body.name, 'baru');
  assert.ok(fs.existsSync(path.join(s.dir, 'baru', '.git')));
  assert.equal((await s.api('POST', '/api/folders', { parent: s.dir, name: 'baru' })).status, 409);
  assert.equal((await s.api('POST', '/api/folders', { parent: s.dir, name: 'a/b' })).body.error.code, 'invalid_folder_name');
  assert.equal((await s.api('POST', '/api/folders', { parent: path.dirname(s.root), name: 'x' })).body.error.code, 'project_outside_root');
  fs.mkdirSync(path.join(s.dir, 'docs'));
  fs.writeFileSync(path.join(s.dir, 'docs', 'backlog.json'), JSON.stringify({ items: [{ id: 'a', status: 'todo' }] }));
  const run = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[ok]' });
  const l = await s.api('GET', '/api/folders?path=' + encodeURIComponent(s.dir));
  assert.equal(l.body.project.hasOpenBacklog, true);
  assert.match(l.body.project.id, /^[0-9a-f]{12}$/);
  const parent = await s.api('GET', '/api/folders');
  assert.equal(parent.body.folders.find((f: any) => f.name === 'app').activeRunId, run.body.id);
});

test('POST /api/runs: tim, perintah, teks, backlog, model tersimpan, project_busy', async (t) => {
  const s = await setup(); t.after(s.close);
  const bad = async (body: object, status: number, code: string) => {
    const r = await s.api('POST', '/api/runs', body);
    assert.equal(r.status, status, JSON.stringify(r.body));
    assert.equal(ApiError.parse(r.body).error.code, code);
    return r.body;
  };
  await bad({ project: s.dir, prompt: 'x', teamId: 'tidak-ada' }, 400, 'team_not_found');
  await bad({ project: s.dir, prompt: 'x', commandId: 'tidak-ada' }, 400, 'command_not_found');
  await bad({ project: s.dir, prompt: '', commandId: 'bebas' }, 400, 'command_needs_text');
  await bad({ project: s.dir, prompt: '', commandId: 'backlog' }, 409, 'no_backlog');
  await bad({ project: s.dir, prompt: 'x', model: 'gpt-5' }, 400, 'invalid_request');
  const link = path.join(s.root, 'tautan'); fs.symlinkSync(path.dirname(s.root), link);
  await bad({ project: link, prompt: 'x' }, 400, 'project_outside_root');
  fs.mkdirSync(path.join(s.dir, 'docs')); fs.writeFileSync(path.join(s.dir, 'docs', 'backlog.json'), '{"items":[]}');
  const t0 = Date.now();
  const r = await s.api('POST', '/api/runs', { project: s.dir, prompt: '', commandId: 'backlog', model: 'opus' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(r.body.model, 'opus');
  assert.equal(r.body.prompt, '/backlog run 5');
  const busy = await bad({ project: s.dir, prompt: 'x' }, 409, 'project_busy');
  assert.equal(busy.error.details.activeRunId, r.body.id);
  await s.api('POST', `/api/runs/${r.body.id}/stop`, {});
});

test('F5: dua jawaban bersamaan, satu menang (200) dan satu 409 already_answered dengan details.state; pilihan > 4 dan multi-pilih tersimpan', async (t) => {
  const s = await setup(); let stop = () => {}; t.after(() => { stop(); return s.close(); });
  const start = await s.api('POST', '/api/runs', { project: s.dir, prompt: '[tanya6]' });
  const runId = start.body.id;
  stop = s.watch(runId);
  const q = await waitFor(() => s.events.find((e) => e.type === 'message' && e.data.kind === 'question'), 8000, 'pertanyaan');
  const m = (q as any).data;
  assert.equal(m.questions[0].options.length, 6);
  assert.equal(m.questions[0].multiSelect, true);
  assert.equal(m.state, 'pending');

  const url = `/api/runs/${runId}/messages/${m.id}/answer`;
  const [a, b] = await Promise.all([
    s.api('POST', url, { kind: 'question', answers: { 'Warna favorit?': ['Merah', 'Ungu'] } }),
    s.api('POST', url, { kind: 'question', answers: { 'Warna favorit?': 'Biru' } }),
  ]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [200, 409]);
  const loser = a.status === 409 ? a : b;
  assert.equal(loser.body.error.code, 'already_answered');
  assert.equal(loser.body.error.details.state, 'answered');

  const win = a.status === 200 ? a : b;
  const saved = (await s.api('GET', `/api/runs/${runId}`)).body.messages.find((x: any) => x.id === m.id);
  assert.equal(saved.state, 'answered');
  assert.equal(saved.answer.from, 'dashboard');
  assert.deepEqual(saved.answer, win.body.answer);
  assert.ok(Date.parse(saved.answeredAt) >= Date.parse(saved.createdAt));
  // tersimpan permanen: dibaca langsung dari store
  assert.equal(s.store.getMessage(m.id)!.answeredAt, saved.answeredAt);
  await waitFor(() => s.events.some((e) => e.type === 'run' && e.data.status === 'done'), 8000, 'run selesai');
  assert.match(fs.readFileSync(path.join(s.dir, 'jawaban.txt'), 'utf8'), /^(Merah, Ungu|Biru)$/);
});

// ---- ch03: kirim pesan, lanjutkan run Selesai, tombol Lanjutkan (F5, F2) ----
const doneRun = async (s: Awaited<ReturnType<typeof setup>>, prompt = '[ok]', project = s.dir, model = 'haiku') => {
  const r = await s.api('POST', '/api/runs', { project, prompt, model });
  await waitFor(() => ['done', 'failed', 'stopped'].includes(s.store.getRun(r.body.id)!.status), 10000, 'run berakhir');
  return r.body.id as string;
};

test('pesan saat Jeda: antre ("queued"), terkirim saat lanjut dengan penanda', async (t) => {
  const s = await setup(); t.after(s.close);
  const id = (await s.api('POST', '/api/runs', { project: s.dir, prompt: '[jeda]' })).body.id;
  await s.api('POST', `/api/runs/${id}/pause`, {});
  const m = await s.api('POST', `/api/runs/${id}/messages`, { text: 'nanti ya' });
  assert.equal(m.status, 201);
  assert.equal(m.body.state, 'queued');
  await s.api('POST', `/api/runs/${id}/resume`, {});
  const after = s.store.listMessages(id).find((x) => x.id === m.body.id)!;
  assert.equal(after.state, 'sent');
  assert.equal(after.sentOnResume, true);
  await s.api('POST', `/api/runs/${id}/stop`, {});
});

test('lanjut run Selesai: sesi dan model sama, tanpa run baru; teks tervalidasi', async (t) => {
  const s = await setup(); t.after(s.close);
  const id = await doneRun(s);
  const sess = s.store.getRun(id)!.sessionId;
  assert.equal((await s.api('POST', `/api/runs/${id}/messages`, { text: '' })).status, 400);
  assert.equal((await s.api('POST', `/api/runs/${id}/messages`, { text: 'x'.repeat(8001) })).status, 400);
  assert.equal((await s.api('POST', `/api/runs/${id}/messages`, { text: 'lagi', extra: 1 })).status, 400);
  const r = await s.api('POST', `/api/runs/${id}/messages`, { text: 'lagi' });
  assert.equal(r.status, 201);
  assert.equal(s.store.getRun(id)!.status, 'running');
  await waitFor(() => s.store.listMessages(id).some((m) => m.text === `lanjut:${sess}:lagi:haiku`), 8000, 'sesi sama + model sama');
  await waitFor(() => s.store.getRun(id)!.status === 'done');
  assert.equal(s.store.listRuns(s.dir).length, 1);
});

test('lanjut run Selesai ditolak: folder hilang / di luar folder kerja; run tetap Selesai', async (t) => {
  const s = await setup(); t.after(s.close);
  const id = await doneRun(s);
  fs.rmSync(s.dir, { recursive: true });
  const r = await s.api('POST', `/api/runs/${id}/messages`, { text: 'halo' });
  assert.equal(r.status, 400);
  assert.match(r.body.error.code, /^project_/);
  assert.equal(s.store.getRun(id)!.status, 'done');
  assert.equal(s.store.listMessages(id).some((m) => m.kind === 'owner'), false);
  // di luar folder kerja (run lama menunjuk ke luar)
  const out = tmpProject('luar');
  const id2 = await doneRun(s, '[ok]', out.dir).catch(() => null);
  assert.equal(id2, null); // proyek di luar folder kerja sudah ditolak saat mulai
  const run = s.store.getRun(id)!;
  s.store.saveRun({ ...run, project: out.dir });
  const r2 = await s.api('POST', `/api/runs/${id}/messages`, { text: 'halo' });
  assert.equal(r2.body.error.code, 'project_outside_root');
  assert.equal(s.store.getRun(id)!.status, 'done');
});

test('pesan ditolak: capacity (dengan activeRunIds), run_read_only, 404', async (t) => {
  const s = await setup(); t.after(s.close);
  const id = await doneRun(s);
  const other = tmpProject('lain');
  fs.cpSync(other.dir, path.join(s.root, 'lain'), { recursive: true });
  const busy = (await s.api('POST', '/api/runs', { project: path.join(s.root, 'lain'), prompt: '[jeda]' })).body.id;
  const r = await s.api('POST', `/api/runs/${id}/messages`, { text: 'halo' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'capacity');
  assert.deepEqual(r.body.error.details.activeRunIds, [busy]);
  assert.equal(s.store.listMessages(id).some((m) => m.kind === 'owner'), false);
  await s.api('POST', `/api/runs/${busy}/stop`, {});
  await waitFor(() => s.store.getRun(busy)!.status === 'stopped', 10000);
  const r2 = await s.api('POST', `/api/runs/${busy}/messages`, { text: 'halo' });
  assert.equal(r2.body.error.code, 'run_read_only');
  assert.equal((await s.api('POST', '/api/runs/tidak-ada/messages', { text: 'x' })).status, 404);
});

test('pesan ke run desktop ditolak desktop_no_prompt', async (t) => {
  const s = await setup(); t.after(s.close);
  const id = await doneRun(s);
  s.store.saveRun({ ...s.store.getRun(id)!, origin: 'desktop' });
  assert.equal((await s.api('POST', `/api/runs/${id}/messages`, { text: 'halo' })).body.error.code, 'desktop_no_prompt');
  assert.equal((await s.api('POST', `/api/runs/${id}/continue`, {})).body.error.code, 'desktop_no_prompt');
});

test('Lanjutkan: run failed dilanjut di sesi terakhir (run sama); galat lain', async (t) => {
  const s = await setup(); t.after(s.close);
  const id = await doneRun(s, '[crash]');
  assert.equal(s.store.getRun(id)!.status, 'failed');
  const sess = s.store.getRun(id)!.sessionId;
  assert.equal((await s.api('POST', `/api/runs/${id}/continue`, { x: 1 })).status, 400);
  const r = await s.api('POST', `/api/runs/${id}/continue`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.id, id);
  assert.equal(r.body.status, 'running');
  await waitFor(() => s.store.listMessages(id).some((m) => m.text === `lanjut:${sess}:Lanjutkan pekerjaan sebelumnya.:haiku`), 8000, 'resume');
  assert.ok(s.store.listMessages(id).some((m) => m.kind === 'system' && m.text === 'Dilanjutkan di sesi baru.'));
  await waitFor(() => s.store.getRun(id)!.status === 'done');
  assert.equal(s.store.listRuns(s.dir).length, 1);
  // sudah Selesai: bukan untuk Lanjutkan
  assert.equal((await s.api('POST', `/api/runs/${id}/continue`, {})).body.error.code, 'run_not_active');
  assert.equal((await s.api('POST', '/api/runs/tidak-ada/continue', {})).status, 404);
});

test('Lanjutkan ditolak: bukan run terakhir, capacity, folder hilang', async (t) => {
  const s = await setup(); t.after(s.close);
  const a = await doneRun(s, '[crash]');
  const b = await doneRun(s, '[ok]'); // run baru di proyek sama -> a bukan terakhir
  assert.equal((await s.api('POST', `/api/runs/${a}/continue`, {})).body.error.code, 'run_read_only');
  const c = await doneRun(s, '[crash]');
  const lain = path.join(s.root, 'lain'); fs.mkdirSync(lain);
  const busy = (await s.api('POST', '/api/runs', { project: lain, prompt: '[jeda]' })).body.id;
  const cap = await s.api('POST', `/api/runs/${c}/continue`, {});
  assert.equal(cap.body.error.code, 'capacity');
  assert.deepEqual(cap.body.error.details.activeRunIds, [busy]);
  assert.equal(s.store.getRun(c)!.status, 'failed');
  await s.api('POST', `/api/runs/${busy}/stop`, {});
  await waitFor(() => s.store.getRun(busy)!.status === 'stopped', 10000);
  fs.rmSync(s.dir, { recursive: true });
  assert.match((await s.api('POST', `/api/runs/${c}/continue`, {})).body.error.code, /^project_/);
  assert.equal(s.store.getRun(c)!.status, 'failed');
  assert.ok(b);
});
