// Seam: Transcripts.usage / recordSessionUsage (antarmuka publik, JSONL fixture nyata di disk + Store :memory:).
// Menangkap: dedupe id pesan, 4 jenis token, model, atribusi ITEM, validasi path, inkremental, simpan ke Store.
// Terlewat: format transkrip versi Claude Code lain; hook belum dipasang ke Harness (item lain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { usage, recordSessionUsage } from '../src/transcripts.js';
import { Store } from '../src/store/index.js';

const root = path.resolve('test/fixtures/transcripts');

test('sesi utama: dedupe per id pesan, sintetis diabaikan, 4 jenis token', () => {
  const u = usage('sess1', undefined, root)!;
  // m1 (output 40, bukan 10+40) + m2; subagent: s1 + s2. Angka dihitung tangan dari fixture.
  assert.deepEqual(u.tokens, { input: 5 + 1 + 7 + 3, output: 40 + 2 + 30 + 20, cacheRead: 100 + 3 + 200 + 250, cacheWrite: 20 + 4 + 50 + 10 });
  assert.equal(u.modelUsed, 'sonnet-5-5'); // 110 token vs opus 71
  assert.deepEqual(u.models, ['sonnet-5-5', 'opus-4-7']);
});

test('pemanggilan agent: nama, ITEM, model, token sendiri', () => {
  const [a, ...rest] = usage('sess1', undefined, root)!.agents;
  assert.equal(rest.length, 0);
  assert.equal(a.id, 'toolu_A');
  assert.equal(a.agent, 'be');
  assert.equal(a.itemKey, 'lp01-transkrip');
  assert.equal(a.modelUsed, 'sonnet-5-5');
  assert.equal(a.toolCount, 2);
  assert.deepEqual(a.tokens, { input: 10, output: 50, cacheRead: 450, cacheWrite: 60 });
});

test('path di luar ~/.claude/projects ditolak; id sesi aneh ditolak; berkas hilang null', () => {
  const out = path.join(os.tmpdir(), 'cc-outside.jsonl');
  fs.writeFileSync(out, '{}\n');
  assert.equal(usage('sess1', out, root), null);
  assert.equal(usage('sess1', path.join(root, '-proj', '..', '..', 'x.jsonl'), root), null);
  assert.equal(usage('../sess1', undefined, root), null);
  assert.equal(usage('nope', undefined, root), null);
});

test('inkremental: baris baru terbaca, baris setengah ditunda', () => {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-tr-'));
  fs.mkdirSync(path.join(r, 'p'));
  const f = path.join(r, 'p', 's9.jsonl');
  const line = (id: string, out: number) => JSON.stringify({ type: 'assistant', timestamp: '2026-11-01T10:00:00Z', message: { id, model: 'claude-sonnet-5-5', usage: { output_tokens: out }, content: [] } });
  fs.writeFileSync(f, line('a', 5) + '\n' + line('b', 7).slice(0, 30));
  assert.equal(usage('s9', undefined, r)!.tokens.output, 5);
  fs.appendFileSync(f, line('b', 7).slice(30) + '\n');
  assert.equal(usage('s9', undefined, r)!.tokens.output, 12);
});

test('disimpan ke Store dan bertahan setelah transkrip hilang', () => {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-tr2-'));
  fs.cpSync(root, r, { recursive: true });
  const store = new Store(':memory:');
  store.saveSession({ id: 'sess1', runId: 'r1', batchId: null, kind: 'batch', startedAt: '2026-11-01T10:00:00Z', endedAt: null, end: 'normal', modelUsed: null, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } });
  assert.ok(recordSessionUsage(store, 'sess1', undefined, r));
  fs.rmSync(r, { recursive: true });
  assert.equal(recordSessionUsage(store, 'sess1', undefined, r), null); // tidak menimpa
  const s = store.getSession('sess1')!;
  assert.equal(s.tokens.output, 92);
  assert.equal(s.modelUsed, 'sonnet-5-5');
  const [act] = store.listActivities('r1');
  assert.equal(act.itemKey, 'lp01-transkrip');
  assert.equal(act.agent, 'be');
  assert.deepEqual(act.tokens, { input: 10, output: 50, cacheRead: 450, cacheWrite: 60 });
  assert.equal(recordSessionUsage(store, 'tidak-ada'), null);
});
