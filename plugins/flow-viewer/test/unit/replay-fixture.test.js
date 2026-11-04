'use strict';
// T12: replay fixture event tersamar (test/fixtures/events/). Nilai harapan = penilaian manual Stop nyata
// (selesai / jeda / berjalan), bukan hasil hitung kode. Log pribadi dijalankan lewat `node test/replay.js`.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { replay, readEvents, MAX_ERR } = require('../replay');
const { asksOwner } = require('../../server/run');

const DIR = path.join(__dirname, '../fixtures/events');
const EVENTS = readEvents(path.join(DIR, 'stop-tersamar.jsonl'));
const EXPECTED = JSON.parse(fs.readFileSync(path.join(DIR, 'stop-tersamar.expected.json'), 'utf8'));
const OUT = replay(EVENTS);
const classOf = (ts) => OUT.rows.find((r) => String(r.ts) === ts);

test('replay: seluruh event fixture dikenali, tanpa exception, tiga proyek terpisah', () => {
  assert.strictEqual(OUT.exceptions.length, 0);
  assert.strictEqual(OUT.unknown, 0);
  assert.strictEqual(OUT.projects.length, 3);
});

test('replay: tiap Stop berlabel diklasifikasikan sama dengan penilaian manual', () => {
  const salah = Object.entries(EXPECTED).filter(([ts, lab]) => classOf(ts).cls !== lab).map(([ts, lab]) => `${ts} manual=${lab} server=${classOf(ts).cls}`);
  assert.deepStrictEqual(salah, []);
});

test('replay: persen salah fixture di bawah 10%', () => {
  const n = Object.keys(EXPECTED).length;
  const wrong = Object.entries(EXPECTED).filter(([ts, lab]) => classOf(ts).cls !== lab).length;
  assert.ok(n >= 10 && wrong / n <= MAX_ERR, `${wrong}/${n}`);
});

test('fixture tidak memuat data pribadi (nama pengguna, path proyek asli, isi prompt)', () => {
  const raw = fs.readFileSync(path.join(DIR, 'stop-tersamar.jsonl'), 'utf8');
  assert.ok(!/ryama|01_Workspace|tryout|toconnect|@\w+\.\w+/i.test(raw));
  EVENTS.filter((e) => e.hook_event_name === 'UserPromptSubmit').forEach((e) => assert.ok(/tersamar|^\/\S/.test(e.prompt), e.prompt));
});

test('asksOwner: pertanyaan di balik catatan kaki Subagent tetap terbaca sebagai Jeda', () => {
  assert.strictEqual(asksOwner('Halo. Mau mulai apa?'), true);
  assert.strictEqual(asksOwner('Mau saya terapkan yang pertama? Saya tunggu. Subagent yang dipakai: tidak ada.'), true);
  assert.strictEqual(asksOwner('Setelah kamu menjawab soal commit di atas: ketik `/clear`.'), true);
  assert.strictEqual(asksOwner('Kalau sudah masuk, kabari saya.'), true);
});

test('asksOwner: laporan akhir tanpa permintaan jawaban bukan Jeda', () => {
  assert.strictEqual(asksOwner('Perubahan disimpan dan diuji. Subagent yang dipanggil: tidak ada.'), false);
  assert.strictEqual(asksOwner('Selesai. Subagent yang dipanggil: `be` (2 kali).'), false);
  assert.strictEqual(asksOwner('Buka http://localhost:3000/?a=1 untuk melihat hasilnya.'), false);
  assert.strictEqual(asksOwner(''), false);
});

// Aturan Stop di server (5.1), lewat antarmuka publik createRun: apply(event), jam palsu, phase.
const { createRun, catalogFromFlows } = require('../../server/run');
const FLOWS = { free: { title: 'Overview', nodes: [{ id: 'be', col: 0, row: 0, role: 'backend', optional: true }], edges: [] } };
function feed(events, ms = 0) {
  let t = 1_700_000_000_000;
  const r = createRun({ key: 'D:/proyek', catalog: catalogFromFlows(FLOWS, { be: { model: 'sonnet', description: 'x', tools: 'Bash', skills: [] } }), now: () => t });
  events.forEach((ev) => { t += 100; r.apply(ev); });
  t += ms;
  return r.phase;
}
const AGEN = [
  { hook_event_name: 'UserPromptSubmit', prompt: 'kerjakan' },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'u1', tool_input: { subagent_type: 'be', prompt: 'x', description: 'x' } },
  { hook_event_name: 'SubagentStart', agent_type: 'be', agent_id: 'a1' },
];
const stop = (msg, bg) => ({ hook_event_name: 'Stop', last_assistant_message: msg, background_tasks: bg });

test('Stop dengan tugas shell basi saja: Selesai setelah 2 dtk, bukan Berjalan selamanya', () => {
  const sh = [{ id: 's1', type: 'shell', status: 'running', command: 'x' }];
  assert.strictEqual(feed([{ hook_event_name: 'UserPromptSubmit', prompt: 'x' }, stop('Selesai.', sh)], 2600), 'finished');
});
test('Stop dengan agent latar masih jalan: tetap Berjalan', () => {
  const sub = [{ id: 'a1', type: 'subagent', status: 'running' }];
  assert.strictEqual(feed([...AGEN, stop('Agen jalan di latar.', sub)], 60000), 'running');
});
test('Stop tanpa agent latar di daftar: node yang kehilangan SubagentStop tidak menahan Selesai', () => {
  assert.strictEqual(feed([...AGEN, stop('Selesai.', [])], 2600), 'finished');
});
test('Stop baru 1 dtk lalu: belum diklasifikasikan (hook bisa tiba tak berurutan)', () => {
  assert.strictEqual(feed([{ hook_event_name: 'UserPromptSubmit', prompt: 'x' }, stop('Selesai.', [])], 1000), 'running');
});
