const test = require('node:test');
const assert = require('node:assert');
const { attention } = require('../../server/attention');

const base = { runId: 1000, session: 's1', phase: 'running', pendings: [], nodes: {}, backlog: [] };
const kinds = (r) => r.map((x) => x.kind);

test('question AskUserQuestion: teks, pilihan, kunci', () => {
  const r = attention({ ...base, pendings: [{ key: 'q:s1:main:tu9', kind: 'question', sender: 's1:main', text: 'Pilih?', options: ['A', 'B'], at: 5 }] });
  assert.deepStrictEqual(r, [{ key: 'q:s1:main:tu9', kind: 'question', agent: 's1:main', text: 'Pilih?', options: ['A', 'B'], at: 5 }]);
});

test('permission jadi item permission', () => {
  const r = attention({ ...base, pendings: [{ key: 'perm:s1:main:t1', kind: 'permission', sender: 's1:main', text: 'Bash', at: 1 }] });
  assert.deepStrictEqual(kinds(r), ['permission']);
});

test('waiting (idle_prompt): muncul saat paused/running, tidak saat finished', () => {
  const w = [{ key: 'q:s1:main:1000.w1', kind: 'waiting', sender: 's1:main', text: 'Lanjut?', at: 1 }];
  assert.deepStrictEqual(kinds(attention({ ...base, phase: 'paused', pendings: w })), ['question']);
  assert.deepStrictEqual(kinds(attention({ ...base, phase: 'finished', pendings: w })), ['done']);
});

test('teks berakhir ? tanpa sinyal: paused tidak membuat item', () => {
  assert.deepStrictEqual(attention({ ...base, phase: 'paused' }), []);
});

test('decision: hanya ready/running dengan checkpoint', () => {
  const b = (status, checkpointQ = 'Setuju?') => ({ id: 'x', title: 't', status, checkpointQ });
  assert.deepStrictEqual(attention({ ...base, backlog: [b('ready')] }).map((x) => x.key), ['dec:backlog:x']);
  assert.deepStrictEqual(attention({ ...base, backlog: [b('done')] }), []);
  assert.deepStrictEqual(attention({ ...base, backlog: [b('parked')] }), []);
  assert.deepStrictEqual(attention({ ...base, backlog: [b('ready', '')] }), []);
});

test('failed: node dan item backlog', () => {
  const r = attention({ ...base, nodes: { be: { status: 'failed', failReason: 'boom', count: 2, lastEventAt: 9 }, fe: { status: 'done' } },
    backlog: [{ id: 'i1', title: 'T', status: 'failed', lastFailure: 'tes merah' }] });
  assert.deepStrictEqual(r.map((x) => x.key).sort(), ['fail:backlog:i1', 'fail:s1:be:1000.2']);
  assert.strictEqual(r.find((x) => x.agent === 'be').text, 'boom');
});

test('done hanya saat finished, kunci per run', () => {
  const r = attention({ ...base, phase: 'finished', finishedAt: 7 });
  assert.deepStrictEqual(r, [{ key: 'done:s1:main:1000', kind: 'done', agent: 'main', text: '', options: [], at: 7 }]);
  assert.deepStrictEqual(attention({ ...base, phase: 'paused' }), []);
});

test('beberapa pemicu: terbaru di atas, kunci unik, dan kunci stabil antar snapshot', () => {
  const snap = () => ({ ...base, phase: 'running', nodes: { be: { status: 'failed', count: 1, lastEventAt: 30 } },
    pendings: [{ key: 'q:s1:main:a', kind: 'question', at: 20 }, { key: 'q:s1:main:a', kind: 'question', at: 20 }, { key: 'perm:s1:main:b', kind: 'permission', at: 10 }] });
  const a = attention(snap()), b = attention({ ...snap(), nodes: { be: { status: 'failed', count: 1, lastEventAt: 31 } } });
  assert.deepStrictEqual(a.map((x) => x.key), ['fail:s1:be:1000.1', 'q:s1:main:a', 'perm:s1:main:b']);
  assert.deepStrictEqual(b.map((x) => x.key), a.map((x) => x.key));
});

test('input kosong atau rusak tidak melempar', () => {
  assert.deepStrictEqual(attention(), []);
  assert.deepStrictEqual(attention({ pendings: [null, {}], backlog: [null, {}], nodes: { x: null } }), []);
});
