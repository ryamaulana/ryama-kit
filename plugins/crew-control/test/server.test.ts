// Seam: HTTP + SSE (kontrak API). Keamanan, validasi, galat seragam, lalu alur ujung ke ujung lewat jaringan sungguhan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Harness } from '../src/harness.js';
import { createApp } from '../src/server.js';
import { Store } from '../src/store.js';
import { ApiError, RunEvent } from '../src/contract.js';
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
    store, hookBaseUrl: `http://127.0.0.1:${port}`, bin: process.execPath, binArgs: [FAKE], finishGraceMs: 150, maxRuns: 1,
  });
  const app = createApp({ store, harness, workRoot: root, maxRuns: 1 });
  await app.listen({ port, host: '127.0.0.1' });
  const base = `http://127.0.0.1:${port}`;
  const api = async (method: string, url: string, body?: unknown) => {
    const r = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
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
  await bad({ project: s.dir, prompt: '   ' }, 400, 'invalid_request');
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
  await waitFor(() => s.store.getRun(id)?.status === 'done' && s.store.listMessages(id).some((m) => m.text.startsWith('lanjut:sess-fake:pesan susulan:haiku')), 8000, 'giliran lanjutan');
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
