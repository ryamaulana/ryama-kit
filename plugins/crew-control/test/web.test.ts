// Tampilan polos: logika murni (web/lib.js) dan penyajian berkas lewat server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Harness } from '../src/harness/index.js';
import { createApp } from '../src/server.js';
import { Store } from '../src/store/index.js';
import { allowedActions, applyEvent, buildQuestionAnswer, describeAnswer, emptyState, isSendKey } from '../web/lib.js';
import { FAKE, tmpProject } from './helpers.js';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const Q = [{ question: 'Warna?', header: null, multiSelect: false, options: [{ label: 'Biru', description: null }] },
  { question: 'Buah?', header: null, multiSelect: true, options: [] }];

test('applyEvent: pesan diperbarui per id (bukan digandakan), run diganti, tool ditambah', () => {
  let s = emptyState();
  s = applyEvent(s, 'message', { id: 'a', state: 'pending' });
  s = applyEvent(s, 'message', { id: 'b', state: null });
  s = applyEvent(s, 'message', { id: 'a', state: 'answered' });
  assert.deepEqual(s.messages.map((m: any) => `${m.id}:${m.state}`), ['a:answered', 'b:null']);
  s = applyEvent(s, 'run', { status: 'done' } as any);
  s = applyEvent(s, 'tool', { name: 'Write' });
  assert.equal((s.run as any).status, 'done');
  assert.equal(s.tools.length, 1);
});

test('buildQuestionAnswer: pilihan, ketikan bebas menang, multi-pilih jadi array, kurang jawaban dilaporkan', () => {
  const r = buildQuestionAnswer(Q, { 'Warna?': ['Biru'], 'Buah?': ['a', 'b'] }, { 'Warna?': '  Hijau ' });
  assert.deepEqual(r.answers, { kind: 'question', answers: { 'Warna?': 'Hijau', 'Buah?': ['a', 'b'] } });
  assert.deepEqual(buildQuestionAnswer(Q, { 'Warna?': ['Biru'] }, {}).missing, ['Buah?']);
});

test('allowedActions: Jeda saat jalan, Lanjut saat dijeda, semua mati saat run berakhir', () => {
  assert.deepEqual(allowedActions('running'), { pause: true, resume: false, stop: true, message: true });
  assert.deepEqual(allowedActions('paused'), { pause: false, resume: true, stop: true, message: true });
  assert.deepEqual(allowedActions('done', 'sess-1'), { pause: false, resume: false, stop: false, message: true });
  assert.equal(allowedActions('stopped', 'sess-1').message, true);
  assert.equal(allowedActions('failed', null).message, false);
});

test('isSendKey: Enter kirim, Shift+Enter baris baru, Enter saat komposisi IME tidak kirim', () => {
  assert.equal(isSendKey({ key: 'Enter', shiftKey: false, isComposing: false }), true);
  assert.equal(isSendKey({ key: 'Enter', shiftKey: true, isComposing: false }), false);
  assert.equal(isSendKey({ key: 'Enter', shiftKey: false, isComposing: true }), false);
  assert.equal(isSendKey({ key: 'a', shiftKey: false, isComposing: false }), false);
});

test('describeAnswer: izin ditolak dengan alasan, dibatalkan agent', () => {
  assert.equal(describeAnswer({ state: 'answered', answer: { from: 'dashboard', answers: null, decision: 'deny', reason: 'jangan' } }), 'Ditolak: jangan');
  assert.match(describeAnswer({ state: 'cancelled', answer: { from: 'agent', answers: null, decision: null, reason: null } }), /agent membatalkan/);
});

test('server melayani halaman dan skrip, menolak path lain; teks agent tidak pernah lewat innerHTML', async (t) => {
  const { root } = tmpProject('app');
  const store = new Store(':memory:');
  const harness = new Harness({ store, hookBaseUrl: 'http://127.0.0.1:1', bin: process.execPath, binArgs: [FAKE], maxRuns: 1 });
  const app = createApp({ store, harness, workRoot: root, maxRuns: 1, webDir: WEB });
  t.after(async () => { harness.shutdown(); await app.close(); });
  const get = (url: string) => app.inject({ method: 'GET', url, headers: { host: 'localhost:4780' } });
  const index = await get('/');
  assert.match(index.headers['content-type'] as string, /text\/html/);
  assert.match(index.body, /<html lang="id">/);
  assert.match((await get('/app.js')).headers['content-type'] as string, /javascript/);
  assert.equal((await get('/lib.js')).statusCode, 200);
  for (const u of ['/package.json', '/..%2Fpackage.json', '/nope.js', '/api/tidak-ada']) assert.equal((await get(u)).statusCode, 404, u);
  assert.equal((await get('/api/health')).statusCode, 200);
  const { readFileSync } = await import('node:fs');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(readFileSync(path.join(WEB, 'app.js'), 'utf8')));
});
