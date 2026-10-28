const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readUsage, agentUsage } = require('../../server/usage');

// Akar transkrip palsu: usage.js membaca CLAUDE_CONFIG_DIR saat dipanggil.
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-usage-root-'));
process.env.CLAUDE_CONFIG_DIR = ROOT;
test.after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

const asst = (id, usage, extra = {}) => JSON.stringify({ type: 'assistant', uuid: 'u-' + id, message: { id, model: 'claude-x', usage, content: [] }, ...extra }) + '\n';

test('dua kali baca file yang bertambah: total token sama dengan isi seluruh file', async () => {
  const f = path.join(ROOT, 'projects', 'p1', 'sesi.jsonl');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, asst('m1', { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 20 }));

  const a = await readUsage([f]);
  assert.deepStrictEqual([a.in, a.out, a.cr, a.cc, a.turns], [10, 5, 100, 20, 1]);

  fs.appendFileSync(f, JSON.stringify({ type: 'user', message: { content: 'halo' } }) + '\n'
    + asst('m2', { input_tokens: 3, output_tokens: 7, cache_read_input_tokens: 50 }));

  const b = await readUsage([f]);
  assert.deepStrictEqual([b.in, b.out, b.cr, b.cc, b.turns], [13, 12, 150, 20, 2]);
  assert.strictEqual(b.ctx, 53, 'konteks = token input pesan terakhir (3 + 50 + 0)');
  assert.strictEqual(b.model, 'claude-x');
});

test('baris yang sedang ditulis saat dibaca dihitung sekali setelah lengkap; id pesan berulang tidak dobel', async () => {
  const f = path.join(ROOT, 'projects', 'p2', 'sesi.jsonl');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const l1 = asst('m1', { input_tokens: 10, output_tokens: 1 });
  const l2 = asst('m2', { input_tokens: 4, output_tokens: 2 });
  fs.writeFileSync(f, l1 + l2.slice(0, 25)); // m2 baru separuh

  const a = await readUsage([f]);
  assert.deepStrictEqual([a.in, a.out, a.turns], [10, 1, 1]);

  // sisa m2 masuk, lalu m1 tertulis lagi (pesan streaming dengan id sama, usage akhir 2 output)
  fs.appendFileSync(f, l2.slice(25) + asst('m1', { input_tokens: 10, output_tokens: 2 }));
  const b = await readUsage([f]);
  assert.deepStrictEqual([b.in, b.out, b.turns], [14, 4, 2]);
});

test('agentUsage: transkrip subagent dipakai; layout lama (sidechain di transkrip utama) jadi cadangan', async () => {
  const dir = path.join(ROOT, 'projects', 'p3');
  const main = path.join(dir, 'sid1.jsonl');
  fs.mkdirSync(path.join(dir, 'sid1', 'subagents'), { recursive: true });
  fs.writeFileSync(main, asst('u0', { input_tokens: 100, output_tokens: 100 })
    + asst('s1', { input_tokens: 7, output_tokens: 3 }, { isSidechain: true, agentId: 'lama' }));
  fs.writeFileSync(path.join(dir, 'sid1', 'subagents', 'agent-baru.jsonl'), asst('b1', { input_tokens: 2, output_tokens: 9 }));
  const ev = { transcript_path: main, session_id: 'sid1' };

  const baru = await agentUsage(ev, 'baru', []);
  assert.deepStrictEqual([baru.in, baru.out, baru.turns], [2, 9, 1]);
  const lama = await agentUsage(ev, 'lama', []);
  assert.deepStrictEqual([lama.in, lama.out, lama.turns], [7, 3, 1]);
  assert.strictEqual(await agentUsage(ev, 'tidakada', []), null);
  assert.strictEqual(await agentUsage({ ...ev, agent_transcript_path: path.join(os.tmpdir(), 'x.jsonl') }, 'tidakada', []), null);
});

test('path di luar akar ~/.claude atau bukan .jsonl ditolak walau isinya transkrip sah', async () => {
  const line = asst('x1', { input_tokens: 1, output_tokens: 1 });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-usage-luar-'));
  try {
    const luar = path.join(outside, 'curian.jsonl');
    fs.writeFileSync(luar, line);
    const bukanJsonl = path.join(ROOT, 'rahasia.txt');
    fs.writeFileSync(bukanJsonl, line);
    const traversal = path.join(ROOT, 'projects', '..', '..', path.basename(outside), 'curian.jsonl');

    assert.strictEqual(await readUsage([luar]), null, 'di luar akar');
    assert.strictEqual(await readUsage([bukanJsonl]), null, 'bukan .jsonl');
    assert.strictEqual(await readUsage([traversal]), null, 'lolos lewat ..');
    fs.mkdirSync(ROOT + '-palsu');
    fs.writeFileSync(path.join(ROOT + '-palsu', 'x.jsonl'), line);
    assert.strictEqual(await readUsage([path.join(ROOT + '-palsu', 'x.jsonl')]), null, 'prefiks nama folder sama');
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
    fs.rmSync(ROOT + '-palsu', { recursive: true, force: true });
  }
});
