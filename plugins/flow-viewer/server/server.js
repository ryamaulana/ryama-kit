#!/usr/bin/env node
// flow-viewer server: receives Claude Code hook events, keeps run state, streams it to the browser.
// No dependencies. Binds to 127.0.0.1 only.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.FLOW_VIEWER_PORT) || 4777;
const DIR = process.env.FLOW_VIEWER_DIR || path.join(os.homedir(), '.claude', 'flow-viewer');
const FLOWS = JSON.parse(fs.readFileSync(path.join(__dirname, 'flows.json'), 'utf8'));
const PUBLIC = path.join(__dirname, 'public');
fs.mkdirSync(DIR, { recursive: true });
const LOG_FILE = path.join(DIR, 'events.jsonl');
const store = require('./store').open(DIR); // riwayat run (SQLite, atau JSON kalau node:sqlite tidak ada)
const readline = require('readline');
const { analyze } = require('./tokens'); // token per pemanggilan, cache ditulis ulang, output tool, limit
const tokenReport = require('./token-report');
const guard = require('./guard');

const norm = (n) => String(n || '').split(':').pop().trim();
const MAIN = '__main';

const clients = new Set();

// ---------- agent definitions (model, tools, skills) read from agents/*.md ----------
let agentDefs = {};
const scannedDirs = new Set();
function parseAgentFile(file) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(txt);
  if (!m) return null;
  const get = (k) => { const r = new RegExp(`^${k}:[ \\t]*(.*)$`, 'm').exec(m[1]); return r ? r[1].trim().replace(/^["']|["']$/g, '') : ''; };
  // Daftar YAML bertingkat (`skills:` lalu baris `  - a`): dulu terbaca kosong.
  const block = (k) => { const r = new RegExp(`^${k}:[ \\t]*\\r?\\n((?:[ \\t]+-[^\\n]*(?:\\n|$))+)`, 'm').exec(m[1]); return r ? r[1].split(/\r?\n/).map((l) => l.replace(/^[ \t]+-[ \t]*/, '').trim().replace(/^["']|["']$/g, '')).filter(Boolean) : []; };
  const name = get('name') || path.basename(file, '.md');
  const sk = get('skills');
  const skills = sk ? sk.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean) : block('skills');
  return { name, model: get('model'), effort: get('effort'), tools: get('tools') || block('tools').join(', '), skills, description: get('description').slice(0, 220) };
}
function scanAgentDir(dir) {
  if (scannedDirs.has(dir)) return;
  scannedDirs.add(dir);
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')); } catch (_) { return; }
  files.forEach((f) => { const d = parseAgentFile(path.join(dir, f)); if (d) agentDefs[d.name] = d; });
}
function loadAgentDefs(cwd) {
  const plugins = path.resolve(__dirname, '..', '..');
  try { fs.readdirSync(plugins).forEach((p) => scanAgentDir(path.join(plugins, p, 'agents'))); } catch (_) {}
  scanAgentDir(path.join(os.homedir(), '.claude', 'agents'));
  if (cwd) scanAgentDir(path.join(cwd, '.claude', 'agents'));
}
loadAgentDefs();

const { createRun, flowCommand, catalogFromFlows, eqOf, rawOf, cap } = require('./run');
const catalog = catalogFromFlows(FLOWS, agentDefs, (cwd) => { // true bila folder agent proyek ini baru dipindai
  if (scannedDirs.has(path.join(cwd, '.claude', 'agents'))) return false;
  loadAgentDefs(cwd); return true;
});
let run = null;      // run aktif (satu proyek dulu; registri proyek menyusul)
let cwdNow = '';
let persistT = null;
function flushRun() {
  clearTimeout(persistT); persistT = null;
  try { const r = store && run && run.row(cwdNow); if (r) { store.save(r); noteSaved(r); } } catch (_) { /* riwayat tidak boleh mengganggu viewer */ }
}
function persistSoon() { if (!store || persistT) return; persistT = setTimeout(flushRun, 1500); }
process.on('exit', () => { try { flushRun(); } catch (_) {} });
['SIGINT', 'SIGTERM'].forEach((sg) => process.on(sg, () => process.exit(0)));

function startRun(flowKey, opts = {}) {
  flushRun();
  run = createRun({ key: cwdNow, flow: flowKey, catalog, usage: { refresh: refreshUsage }, prev: run, backlog: backlogSummary, onChange: (r) => { if (r === run) broadcast(); }, ...opts });
}
function ingest(ev) {
  if (typeof ev.cwd === 'string' && path.isAbsolute(ev.cwd)) cwdNow = ev.cwd;
  const fk = flowCommand(ev, FLOWS);
  if (fk || (run && run.rollover(ev))) startRun(fk || 'free'); // perintah flow, sesi baru, atau prompt setelah selesai = run baru
  const ok = run.apply(ev);
  if (ok && (ev.hook_event_name || ev.event) === 'Stop') writeTokenFileSoon();
  return ok;
}

// ---------- token usage / actual model from the Claude Code transcript ----------
function parseUsage(text, filter, names) {
  const byId = new Map();
  let model = '', last = null, audits = 0;
  const skillEv = {};
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = (names || []).map((nm) => ({ nm, load: new RegExp('Base directory for this skill[^"]{0,240}' + esc(nm) + '(?![\\w-])|name: ' + esc(nm) + '\\\\n(?:[^"]{0,40})?description:'), hook: nm === 'caveman' ? /caveman/i : null }));
  const reads = new Map(), imgPaths = new Map();
  for (const line of text.split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch (_) { continue; }
    if (filter && !filter(o)) continue;
    if (rx.length && o.type !== 'assistant' && !/tool_use_id/.test(line)) {
      for (const r of rx) {
        if (skillEv[r.nm]) continue;
        if (r.load.test(line)) skillEv[r.nm] = 'termuat';
        else if (r.hook && r.hook.test(line) && /hook|SessionStart|additionalContext|system-reminder/i.test(line)) skillEv[r.nm] = 'hook';
      }
    }
    if (o.type === 'assistant' && o.message && Array.isArray(o.message.content)) {
      for (const b of o.message.content) if (b && b.type === 'tool_use' && b.name === 'Skill' && b.input) { const sn = String(b.input.skill || b.input.name || '').replace(/^.*:/, ''); if (sn) skillEv[sn] = 'dipanggil'; }
    }
    if (o.type === 'assistant' && o.message && Array.isArray(o.message.content)) {
      for (const b of o.message.content) {
        if (!b || b.type !== 'tool_use' || !b.input) continue;
        const fp = b.input.file_path || '';
        if (b.name === 'Read' && fp) {
          const k = fp.replace(/\\/g, '/');
          reads.set(k, (reads.get(k) || 0) + 1);
          if (/\.(png|jpe?g|webp|gif)$/i.test(k)) imgPaths.set(k, (imgPaths.get(k) || 0) + 1);
        }
        if (b.name === 'Bash' && /run-audit\.js/.test(b.input.command || '')) audits++;
      }
    }
    if (o.type !== 'assistant' || !o.message || !o.message.usage) continue;
    byId.set(o.message.id || o.uuid, o.message.usage);
    last = o.message.usage;
    if (o.message.model && o.message.model !== '<synthetic>') model = o.message.model;
  }
  const u = { in: 0, out: 0, cr: 0, cc: 0, turns: byId.size, model, ctx: 0, audits, skillEv, imgReads: 0, imgUniq: imgPaths.size, dupReads: 0 };
  for (const c of imgPaths.values()) u.imgReads += c;
  for (const c of reads.values()) if (c > 1) u.dupReads += c - 1;
  for (const x of byId.values()) {
    u.in += x.input_tokens || 0; u.out += x.output_tokens || 0;
    u.cr += x.cache_read_input_tokens || 0; u.cc += x.cache_creation_input_tokens || 0;
  }
  if (last) u.ctx = (last.input_tokens || 0) + (last.cache_read_input_tokens || 0) + (last.cache_creation_input_tokens || 0);
  return u;
}
const readText = (f) => fs.promises.readFile(f, 'utf8').catch(() => null);

async function agentUsage(ev, agentId, names) {
  const tp = ev.transcript_path;
  const cands = [];
  // agent_transcript_path milik agent yang mengirim event; untuk id lain dipakai, file yang sama terbaca berkali-kali (token dobel).
  if (ev.agent_transcript_path && (!ev.agent_id || ev.agent_id === agentId)) cands.push(ev.agent_transcript_path);
  if (tp && agentId) {
    const dir = path.dirname(tp), sid = ev.session_id || path.basename(tp, '.jsonl');
    cands.push(path.join(dir, sid, 'subagents', `agent-${agentId}.jsonl`), path.join(dir, `agent-${agentId}.jsonl`));
  }
  for (const f of cands) {
    const t = await readText(f);
    if (t) { const u = parseUsage(t, null, names); if (u.turns) { u.inv = analyze(t); u.file = path.resolve(f).toLowerCase(); return u; } }
  }
  if (tp && agentId) { // older layout: sidechain messages live inside the main transcript
    const t = await readText(tp);
    const filter = (o) => o.isSidechain && o.agentId === agentId;
    if (t) { const u = parseUsage(t, filter, names); if (u.turns) { u.inv = analyze(t, { filter }); u.file = path.resolve(tp).toLowerCase() + '#' + agentId; return u; } }
  }
  return null;
}

async function refreshUsage(run, key, ev, force) {
  const state = run.state, details = run.details, usageAt = run.usageAt;
  if (!ev.transcript_path) return;
  const now = Date.now();
  if (!force && usageAt[key] && now - usageAt[key] < 4000) return;
  usageAt[key] = now;
  try {
    if (key === MAIN) {
      const t = await readText(ev.transcript_path);
      if (!t) return;
      const allNames = [...new Set([...Object.values(state.nodes).flatMap((x) => x.skillsDef || []), 'caveman'])];
      const u = parseUsage(t, (o) => !o.isSidechain, allNames);
      // Sesi utama bisa melewati beberapa run: token dihitung hanya sejak run ini mulai.
      const A = analyze(t, { filter: (o) => !o.isSidechain, from: state.startedAt - 1000 });
      if (A.turns) { Object.assign(u, { in: A.in, out: A.out, cr: A.cr, cc: A.cc, turns: A.turns, ctx: A.ctxLast }); state.main.tokens = slimMain(A); }
      if (u.turns) { state.main.usage = u; state.main.model = u.model; }
    } else {
      const n = state.nodes[key], d = details[key];
      if (!n || !d || !d.agentIds.length) return;
      const sum = { in: 0, out: 0, cr: 0, cc: 0, turns: 0, model: '', ctx: 0, audits: 0, skillEv: {}, imgReads: 0, imgUniq: 0, dupReads: 0 };
      let any = false;
      const invs = [], seenF = new Set();
      for (const id of d.agentIds) {
        const u = await agentUsage(ev, id, [...new Set([...(n.skillsDef || []), 'caveman'])]);
        if (!u || seenF.has(u.file)) continue; // dua id ke file yang sama: hitung sekali
        seenF.add(u.file);
        any = true;
        if (u.inv && !(u.inv.t0 && u.inv.t0 < state.startedAt - 60000)) invs.push(slimInv(id, u.inv));
        sum.in += u.in; sum.out += u.out; sum.cr += u.cr; sum.cc += u.cc; sum.turns += u.turns; sum.audits += u.audits; Object.assign(sum.skillEv, u.skillEv); sum.imgReads += u.imgReads; sum.imgUniq += u.imgUniq; sum.dupReads += u.dupReads;
        sum.model = u.model || sum.model; sum.ctx = u.ctx;
      }
      if (any) { n.usage = sum; n.invocations = invs.sort((a, b) => a.t0 - b.t0); }
    }
    run.touch();
  } catch (_) { /* best effort */ }
}

// ---------- token per pemanggilan (lihat tokens.js) ----------
function slimInv(agentId, A) {
  return { agentId, item: A.item, prompt: A.prompt.slice(0, 120), model: A.model, byModel: A.byModel, turns: A.turns, in: A.in, out: A.out, cr: A.cr, cc: A.cc, raw: A.raw, eq: eqOf(A),
    ctxFirst: A.ctxFirst, ctxPeak: A.ctxPeak, ctxLast: A.ctxLast, t0: A.t0, t1: A.t1, imgs: A.imgs, coldN: A.cold.length, coldTok: A.coldTok, heavy: A.heavy.slice(0, 5), outTok: A.outTok, tools: A.tools };
}
function slimMain(A) {
  return { byModel: A.byModel, turns: A.turns, raw: A.raw, ctxFirst: A.ctxFirst, ctxPeak: A.ctxPeak, ctxLast: A.ctxLast, cold: A.cold, coldTok: A.coldTok, handbacks: A.handbacks, heavy: A.heavy, limits: A.limits.slice(0, 20), outTok: A.outTok };
}
function mergeA(list) {
  if (list.length === 1) return list[0];
  const M = analyze('');
  for (const A of list) {
    for (const k of ['in', 'out', 'cr', 'cc', 'raw', 'turns', 'imgs', 'coldTok']) M[k] += A[k] || 0;
    M.ctxPeak = Math.max(M.ctxPeak, A.ctxPeak); M.ctxLast = A.ctxLast || M.ctxLast;
    for (const k of ['byModel', 'outTok', 'tools']) for (const [x, v] of Object.entries(A[k] || {})) M[k][x] = (M[k][x] || 0) + v;
    M.cold.push(...A.cold); M.heavy.push(...A.heavy); M.limits.push(...A.limits);
    const h = A.handbacks || {}; M.handbacks = { n: M.handbacks.n + (h.n || 0), avg: 0, max: Math.max(M.handbacks.max, h.max || 0), top: [...M.handbacks.top, ...(h.top || [])], sum: (M.handbacks.sum || 0) + (h.avg || 0) * (h.n || 0) };
  }
  M.handbacks.avg = M.handbacks.n ? Math.round(M.handbacks.sum / M.handbacks.n) : 0; delete M.handbacks.sum;
  M.handbacks.top = M.handbacks.top.sort((a, b) => b.chars - a.chars).slice(0, 5);
  M.cold = M.cold.sort((a, b) => b.cc - a.cc).slice(0, 20); M.heavy = M.heavy.sort((a, b) => b.tok - a.tok).slice(0, 8);
  return M;
}
const sameDir = (a, b) => { const f = (x) => path.resolve(String(x || '')).toLowerCase(); return !!a && !!b && (f(a) === f(b) || f(a).startsWith(f(b) + path.sep)); };

// Analisis ulang run dari riwayat: path transkrip dan id agent diambil dari events.jsonl dalam rentang waktu run itu.
async function rescanRun(id) {
  const row = store && store.get(id);
  if (!row) throw new Error('run tidak ada');
  if (id === run.id) throw new Error('run yang sedang berjalan dihitung langsung dari hook');
  const st = typeof row.state === 'string' ? JSON.parse(row.state) : row.state;
  // Batas atas = akhir run itu (tanpa kelonggaran): agent yang mulai beberapa detik setelahnya milik run berikutnya.
  const from = row.started_at - 1000, to = row.updated_at || Date.now();
  const mains = new Map(), agents = new Map(), segs = [];
  let open = null;
  if (fs.existsSync(LOG_FILE)) {
    const rl = readline.createInterface({ input: fs.createReadStream(LOG_FILE, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of rl) {
      const mt = /^\{"ts":(\d+)/.exec(line);
      if (!mt) continue;
      const ts = Number(mt[1]);
      if (ts < from) continue;
      if (ts > to) break;
      let ev; try { ev = JSON.parse(line); } catch (_) { continue; }
      if (row.project && ev.cwd && !sameDir(ev.cwd, row.project)) continue;
      const e = ev.hook_event_name || ev.event;
      const tp = typeof ev.transcript_path === 'string' ? ev.transcript_path : '';
      if (ev.agent_id && norm(ev.agent_type)) {
        const prev = agents.get(ev.agent_id);
        if (!prev || (!prev.ev.agent_transcript_path && ev.agent_transcript_path)) agents.set(ev.agent_id, { type: norm(ev.agent_type), ev: { transcript_path: tp, agent_transcript_path: ev.agent_transcript_path, session_id: ev.session_id } });
      } else if (tp) {
        mains.set(tp, true);
        if (e === 'UserPromptSubmit' && open === null) open = ts;
        if (e === 'Stop' && open !== null) { segs.push({ s: open, e: ts }); open = null; }
      }
    }
  }
  const byNode = {}, seenF = new Set();
  for (const [aid, a] of agents) {
    const u = await agentUsage(a.ev, aid, []);
    if (u && seenF.has(u.file)) continue;
    if (u) seenF.add(u.file);
    if (u && u.inv && !(u.inv.t0 && u.inv.t0 < row.started_at - 60000)) (byNode[a.type] = byNode[a.type] || []).push(slimInv(aid, u.inv)); // dimulai di run sebelumnya: milik run itu
  }
  for (const [k, invs] of Object.entries(byNode)) {
    const n = st.nodes[k]; if (!n) continue;
    n.invocations = invs.sort((a, b) => a.t0 - b.t0);
    const s = { in: 0, out: 0, cr: 0, cc: 0, turns: 0 };
    for (const v of invs) for (const f of Object.keys(s)) s[f] += v[f] || 0;
    n.usage = { ...(n.usage || {}), ...s, ctx: invs[invs.length - 1].ctxLast, model: 'claude-' + (invs[invs.length - 1].model || '') };
  }
  const mainAs = [];
  for (const tp of mains.keys()) {
    const t = await readText(tp);
    if (t) { const A = analyze(t, { filter: (o) => !o.isSidechain, from: row.started_at - 1000, to: row.updated_at || Date.now() }); if (A.turns) mainAs.push(A); }
  }
  if (mainAs.length) st.main.tokens = slimMain(mergeA(mainAs));
  if (segs.length) st.mainSegs = segs;
  if (mainAs.length) { const A = mergeA(mainAs); st.main.usage = { ...(st.main.usage || {}), in: A.in, out: A.out, cr: A.cr, cc: A.cc, turns: A.turns, ctx: A.ctxLast }; }
  const us = [st.main.usage, ...Object.values(st.nodes).map((n) => n.usage)].filter(Boolean);
  row.tokens_eq = us.reduce((a, u) => a + eqOf(u), 0); row.tokens_raw = us.reduce((a, u) => a + rawOf(u), 0);
  st.tokensScan = { at: Date.now(), agents: agents.size, analysed: Object.values(byNode).reduce((a, x) => a + x.length, 0), sessions: mains.size };
  store.save({ ...row, state: JSON.stringify(st) });
  noteSaved(row);
  writeTokenFile(row.project);
  return st.tokensScan;
}

const parseJ = (x, d) => { if (x && typeof x === 'object') return x; try { return JSON.parse(x); } catch (_) { return d; } };
function tokenBuild(project, n = 60) {
  flushRun();
  const rows = store ? store.list(project, n) : [];
  const runs = rows.map((r) => { const full = store.get(r.id) || {}; return { ...r, state: parseJ(full.state, {}), convo: parseJ(full.convo, []) }; });
  return { rows: rows.length, R: tokenReport.build(runs, project) };
}
// Salinan markdown untuk dibaca AI di folder proyek: <proyek>/.flow-viewer/laporan-token.md (folder itu meng-ignore dirinya sendiri).
// Hanya proyek yang tercatat di riwayat run; nilai dari luar (?project=) tidak pernah dipakai mentah sebagai folder.
// Peta proyek -> pernah berisi sesi nyata (token > 0); dibangun sekali, diperbarui saat simpan/hapus run.
let projCache = null;
function projectMap() {
  if (!projCache) { projCache = new Map(); for (const r of store.list('', 1000)) if (r.project) projCache.set(r.project, projCache.get(r.project) || r.tokens_raw > 0); }
  return projCache;
}
function noteSaved(r) { if (projCache && r && r.project) projCache.set(r.project, projCache.get(r.project) || r.tokens_raw > 0); }
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch (_) { return false; } };
// Folder sembarang dari event palsu tidak dianggap proyek: wajib docs/ atau .claude/, atau pernah ada sesi bertoken.
function knownProject(p) {
  if (typeof p !== 'string' || p === '' || !projectMap().has(p)) return false;
  return projectMap().get(p) || isDir(path.join(p, 'docs')) || isDir(path.join(p, '.claude'));
}
function writeTokenFile(project) {
  try {
    if (!knownProject(project) || !fs.statSync(project).isDirectory()) return;
    const { rows, R } = tokenBuild(project);
    if (!rows) return;
    // Symlink/junction: .flow-viewer dan file di dalamnya wajib tetap di dalam folder proyek asli.
    const root = fs.realpathSync(project);
    const dir = path.join(root, '.flow-viewer');
    fs.mkdirSync(dir, { recursive: true });
    if (fs.realpathSync(dir) !== dir) return;
    for (const [name, text] of [['.gitignore', '*\n'], ['laporan-token.md', tokenReport.markdown(R)]]) {
      const f = path.join(dir, name);
      try { if (fs.lstatSync(f).isSymbolicLink()) return; } catch (_) { /* belum ada */ }
      fs.writeFileSync(f, text);
    }
  } catch (_) { /* laporan tidak boleh mengganggu viewer */ }
}
let tokenFileAt = 0;
function writeTokenFileSoon() { const now = Date.now(); if (now - tokenFileAt < 60000) return; tokenFileAt = now; setTimeout(() => writeTokenFile(cwdNow), 3000); }

let blCache = { key: '', val: null };
function backlogSummary() {
  if (!cwdNow) return null;
  const f = path.join(cwdNow, 'docs', 'backlog.json');
  try {
    const st = fs.statSync(f), key = f + ':' + st.mtimeMs;
    if (blCache.key === key) return blCache.val;
    const db = JSON.parse(fs.readFileSync(f, 'utf8')), by = Object.fromEntries(db.items.map((i) => [i.id, i]));
    const items = db.items.map((i) => {
      const ready = i.status === 'todo' && (i.needs || []).every((n) => by[n] && by[n].status === 'done');
      return { id: i.id, title: i.title, type: i.type || '', agent: i.agent || '', status: i.status === 'todo' ? (ready ? 'ready' : 'waiting') : i.status, needs: (i.needs || []).filter((n) => by[n] && by[n].status !== 'done'), owner: !!i.checkpoint, evidence: i.evidence || '', size: i.size || 'm', fase: i.type || 'lain', checkpointQ: i.checkpoint || '' };
    });
    const c = (s) => items.filter((i) => i.status === s).length;
    const parked = items.filter((i) => i.status === 'parked'), live = items.filter((i) => i.status !== 'rejected' && i.status !== 'parked'), W = { s: 1, m: 2, l: 4 }, w = (i) => W[i.size] || 2, wTot = live.reduce((a, i) => a + w(i), 0), wDone = live.filter((i) => i.status === 'done').reduce((a, i) => a + w(i), 0), fase = {};
    live.forEach((i) => { const f = fase[i.fase] || (fase[i.fase] = { nama: i.fase, total: 0, done: 0 }); f.total++; if (i.status === 'done') f.done++; });
    const val = { pct: wTot ? Math.round(wDone / wTot * 100) : 0, fase: Object.values(fase), project: db.project || '', total: live.length, parked: parked.map((i) => ({ id: i.id, title: i.title })), done: c('done'), running: c('running'), ready: c('ready'), waiting: c('waiting'), failed: c('failed'), items };
    blCache = { key, val }; return val;
  } catch (_) { blCache = { key: '', val: null }; return null; }
}
function broadcast() {
  const data = `data: ${JSON.stringify(run.snapshot())}

`;
  for (const c of clients) c.write(data);
  persistSoon();
}

const BUILD = require('./build-id')();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const sendErr = (res, e) => { res.writeHead(e.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.code, message: e.message })); };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  // [SEC] DNS rebinding (Host) dan CSRF (Origin/Sec-Fetch-Site pada POST) untuk semua path.
  const bad = guard.checkRequest(req, PORT);
  if (bad) { req.resume(); return sendErr(res, bad); }
  if (req.method === 'POST' && url === '/event') {
    // Form/sendBeacon lintas situs hanya bisa mengirim text/plain tanpa preflight; hook selalu application/json.
    if (!/^application\/json(\s*;|$)/i.test(req.headers['content-type'] || '')) { req.resume(); return sendErr(res, { status: 415, code: 'bad_content_type', message: 'Content-Type wajib application/json.' }); }
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4e6) req.destroy(); });
    req.on('end', () => {
      try {
        const ev = JSON.parse(body);
        fs.appendFile(LOG_FILE, JSON.stringify({ ts: Date.now(), ...ev }) + '\n', () => {});
        if (ingest(ev)) broadcast();
      } catch (_) { /* ignore malformed */ }
      res.writeHead(204); res.end();
    });
    return;
  }
  if (req.method === 'POST' && url === '/reset') {
    startRun(run.state.flow, { fresh: true }); broadcast(); res.writeHead(204); res.end(); return;
  }
  if (url === '/report.md') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(run.report()); return; }
  if (url === '/report') {
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="4"><title>Laporan Flow Viewer</title><body style="font:14px/1.5 ui-monospace,Consolas,monospace;background:#fff;color:#111;padding:16px"><pre style="white-space:pre-wrap;margin:0">${esc(run.report())}</pre></body>`);
    return;
  }
  if (url === '/report/tokens.md' || url === '/report/tokens.json') {
    const q = new URLSearchParams(req.url.split('?')[1] || '');
    const project = q.get('project');
    if (!knownProject(project)) { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Proyek tidak dikenal. Pilih proyek dari riwayat run.'); return; }
    try {
      const { rows, R } = tokenBuild(project, Math.min(200, Number(q.get('n')) || 60));
      if (rows && q.get('write') !== '0') writeTokenFile(project);
      if (url.endsWith('.json')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(R)); }
      else { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(tokenReport.markdown(R)); }
    } catch (_) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Laporan gagal dibuat.'); } // err.message bisa memuat path lokal
    return;
  }
  if (req.method === 'POST' && url === '/history/rescan') {
    const id = Number(new URLSearchParams(req.url.split('?')[1] || '').get('id'));
    rescanRun(id).then((r) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, ...r })); })
      .catch((err) => { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: err.message })); });
    return;
  }
  if (url === '/history') {
    const q = new URLSearchParams(req.url.split('?')[1] || '');
    let rows = [];
    try { if (store) rows = store.list(q.get('all') === '1' ? '' : cwdNow, 60); } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ kind: store ? store.kind : 'none', current: cwdNow || '', liveId: run.id, rows }));
    return;
  }
  if (url === '/history/get') {
    const id = Number(new URLSearchParams(req.url.split('?')[1] || '').get('id'));
    let r = null;
    try { if (store && id === run.id) flushRun(); r = store && id ? store.get(id) : null; } catch (_) {}
    if (!r) { res.writeHead(404); res.end('{}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: r.id, project: r.project, state: JSON.parse(r.state), convo: JSON.parse(r.convo || '[]') }));
    return;
  }
  if (req.method === 'POST' && url === '/history/delete') {
    const id = Number(new URLSearchParams(req.url.split('?')[1] || '').get('id'));
    try { if (store && id && id !== run.id) { store.remove(id); projCache = null; } } catch (_) {}
    res.writeHead(204); res.end(); return;
  }
  if (url === '/detail') {
    const id = new URLSearchParams(req.url.split('?')[1] || '').get('id') || MAIN;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(run.detail(id)));
    return;
  }
  if (url === '/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(run.snapshot())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url === '/state') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(run.snapshot())); return; }
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, build: BUILD })); return; }
  if (req.method === 'POST' && url === '/quit') { res.writeHead(200); res.end('bye'); setTimeout(() => process.exit(0), 100); return; }
  if (req.method === 'GET') {
    const file = url === '/' ? 'index.html' : path.normalize(url).replace(/^([/\\]|\.\.)+/g, '');
    const full = path.join(PUBLIC, file);
    if (full.startsWith(PUBLIC) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(full).pipe(res); return;
    }
  }
  res.writeHead(404); res.end('not found');
});

startRun('free');
setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 20000);
setInterval(() => { if (run && run.tick()) { persistSoon(); broadcast(); } }, 500).unref();
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`flow-viewer: port ${PORT} sudah dipakai (mungkin sudah jalan)`); process.exit(0); }
  throw err;
});
server.listen(PORT, '127.0.0.1', () => console.log(`flow-viewer: http://localhost:${PORT}`));
