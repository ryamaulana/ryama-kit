'use strict';
// Replay event nyata ke server (createRegistry + createRun) dengan jam palsu dari `ts` event.
// Pakai: node test/replay.js [berkas.jsonl] [--table] [--dump=<berkas>]
//   tanpa argumen: ~/.claude/flow-viewer/events.jsonl (log pribadi; isi mentah tidak disalin ke repo).
// Label penilaian manual: test/fixtures/events/labels.json  { "<ts Stop>": "selesai|jeda|berjalan" }.
// Keluar 1 bila salah > 10% dari Stop berlabel atau ada exception. ARCHITECTURE 5.1 dan 11.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createRegistry } = require('../server/projects');
const { catalogFromFlows, asksOwner } = require('../server/run');

const SETTLE_MS = 2000;        // sama dengan SETTLE_MS di server/run.js (5.1)
const EVAL_AFTER_MS = 2500;    // 2 dtk + satu putaran tick server (500 ms)
const MAX_ERR = 0.10;
const NEW_WORK = new Set(['UserPromptSubmit', 'PreToolUse', 'SubagentStart', 'SessionStart']);
const FLOWS = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/flows.json'), 'utf8'));
const CATALOG = { catalogFor: () => ({ ...catalogFromFlows(FLOWS, {}), refresh: () => false }) };

function readEvents(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter((e) => e && e.ts);
}

// Kelas Stop menurut server: fase run pada saat klasifikasi (2 dtk tanpa event, atau tepat sebelum event berikut yang satu proyek).
function classOf(run) {
  const ph = run.phase;
  if (ph === 'paused') return 'jeda';
  if (ph === 'finished') return 'selesai';
  return 'berjalan';
}

// Alasan kelas (untuk tabel): langkah wajib belum jalan, tanda tanya, agent/tugas latar, atau selesai biasa.
function whyOf(s) {
  const S = s.run.state, cls = classOf(s.run);
  if (cls === 'berjalan') return s.bgSub ? 'agent-latar' : s.bgShell ? 'shell-latar' : 'kerja-berlanjut';
  if (cls === 'selesai') return S.outcome || 'ok';
  if (asksOwner(s.msg)) return 'tanda-tanya';
  return 'langkah-wajib';
}

function replay(events) {
  let clock = 0;
  const reg = createRegistry({ catalog: CATALOG, now: () => clock });
  const sorted = events.slice().sort((a, b) => a.ts - b.ts);
  const counts = {}, exceptions = [], rows = [], projects = new Set();
  let pending = [];
  let unknown = 0;

  const evaluate = (s, at) => {
    clock = at;
    try { s.cls = classOf(s.run); s.outcome = s.run.state.outcome || ''; s.flow = s.run.state.flow; s.why = whyOf(s); } catch (e) { exceptions.push({ ts: s.ts, error: String(e && e.stack || e) }); s.cls = 'exception'; }
    rows.push(s);
  };

  for (const ev of sorted) {
    const name = ev.hook_event_name || '?';
    counts[name] = (counts[name] || 0) + 1;
    // Stop yang menunggu klasifikasi: dievaluasi setelah EVAL_AFTER_MS tanpa event (jam server menunda bila ada event
    // pengiring yang tak berurutan), atau tepat sebelum kerja baru (prompt, tool, agent mulai, sesi) di sesi/folder yang sama.
    pending = pending.filter((s) => {
      const same = ev.session_id === s.sid || (ev.cwd && ev.cwd === s.cwd);
      if (ev.ts - s.last >= EVAL_AFTER_MS) { evaluate(s, s.last + EVAL_AFTER_MS); return false; }
      if (same && NEW_WORK.has(name)) { evaluate(s, Math.max(s.last, ev.ts - 1)); return false; }
      if (same) s.last = ev.ts; // pengiring (PostToolUse, SubagentStop, ...): jam 2 dtk mulai lagi
      return true;
    });
    clock = ev.ts;
    let p = null;
    try { p = reg.ingest(ev); } catch (e) { exceptions.push({ ts: ev.ts, event: name, error: String(e && e.stack || e) }); continue; }
    if (!p) { unknown += 1; continue; }
    projects.add(p.key);
    if (name === 'Stop') {
      const bgl = (Array.isArray(ev.background_tasks) ? ev.background_tasks : []).filter((x) => x && (x.status || 'running') === 'running'), bg = bgl.length, bgSub = bgl.filter((x) => x.type === 'subagent').length, bgShell = bgl.filter((x) => x.type === 'shell').length;
      pending.push({ ts: ev.ts, last: ev.ts, sid: ev.session_id, cwd: ev.cwd, project: p.key, run: p.run, bg, bgSub, bgShell, msg: String(ev.last_assistant_message || ''), next: null });
    }
  }
  for (const s of pending) evaluate(s, s.last + EVAL_AFTER_MS);
  // tick berkala server tidak boleh melempar
  try { reg.all().forEach((p) => p.run && p.run.tick()); } catch (e) { exceptions.push({ ts: 0, error: String(e && e.stack || e) }); }
  rows.sort((a, b) => a.ts - b.ts);
  return { rows, counts, exceptions, projects: [...projects], unknown, total: sorted.length };
}

function score(rows, labels) {
  const m = { selesai: {}, jeda: {}, berjalan: {} };
  let n = 0, wrong = 0;
  const diffs = [];
  for (const r of rows) {
    const truth = labels[String(r.ts)];
    if (!truth) continue;
    n += 1;
    m[truth][r.cls] = (m[truth][r.cls] || 0) + 1;
    if (truth !== r.cls) { wrong += 1; diffs.push({ ts: r.ts, truth, got: r.cls, bg: r.bg, tail: r.msg.slice(-90).replace(/\s+/g, ' ') }); }
  }
  return { n, wrong, pct: n ? wrong / n : 0, matrix: m, diffs };
}

function loadLabels() {
  const f = path.join(__dirname, 'fixtures/events/labels.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--')) || path.join(os.homedir(), '.claude/flow-viewer/events.jsonl');
  if (!fs.existsSync(file)) { console.error('events.jsonl tidak ada: ' + file); process.exit(2); }
  const out = replay(readEvents(file));
  const dumpArg = args.find((a) => a.startsWith('--dump='));
  if (dumpArg) fs.writeFileSync(dumpArg.slice(7), out.rows.map((r) => JSON.stringify({ ts: r.ts, project: path.basename(r.project), cls: r.cls, outcome: r.outcome, flow: r.flow, why: r.why, bg: r.bg, sub: r.bgSub, sh: r.bgShell, msg: r.msg })).join('\n'));
  const byCls = out.rows.reduce((a, r) => ((a[r.cls] = (a[r.cls] || 0) + 1), a), {});
  console.log(`event: ${out.total} (dikenal ${out.total - out.unknown}), Stop: ${out.rows.length}, proyek: ${out.projects.length}, exception: ${out.exceptions.length}`);
  console.log('hook:', JSON.stringify(out.counts));
  console.log('klasifikasi server:', JSON.stringify(byCls));
  const sc = score(out.rows, loadLabels());
  if (sc.n) {
    console.log(`berlabel: ${sc.n}, salah: ${sc.wrong} (${(sc.pct * 100).toFixed(1)}%)  [baris = penilaian manual, kolom = server]`);
    for (const t of ['selesai', 'jeda', 'berjalan']) console.log(`  ${t.padEnd(9)} -> ${JSON.stringify(sc.matrix[t])}`);
    if (args.includes('--table')) sc.diffs.forEach((d) => console.log(`  SALAH ${d.ts} manual=${d.truth} server=${d.got} bg=${d.bg} ...${d.tail}`));
  } else console.log('tanpa label manual: hanya klasifikasi server');
  out.exceptions.forEach((e) => console.error('EXCEPTION', e.ts, e.error));
  process.exit(out.exceptions.length || sc.pct > MAX_ERR ? 1 : 0);
}

if (require.main === module) main();
module.exports = { replay, score, readEvents, classOf, MAX_ERR };
