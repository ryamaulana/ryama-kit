#!/usr/bin/env node
// flow-viewer server: menerima event hook Claude Code, menyimpan run per proyek (projects.js), menyiarkannya ke browser.
// Tanpa dependensi. Hanya bind 127.0.0.1. Kontrak: docs/ARCHITECTURE.md bagian 6 dan 7.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const PORT = Number(process.env.FLOW_VIEWER_PORT) || 4777;
const DIR = process.env.FLOW_VIEWER_DIR || path.join(os.homedir(), '.claude', 'flow-viewer');
fs.mkdirSync(DIR, { recursive: true });
const LOG_FILE = path.join(DIR, 'events.jsonl');
const LOG_OLD = path.join(DIR, 'events.1.jsonl');
const LOG_MAX = Number(process.env.FLOW_VIEWER_LOG_MAX) || 20 * 1024 * 1024; // 8.2: rotasi 20 MB
const MAX_SSE = 50;      // 8.2
const THROTTLE_MS = 250; // 6: siaran per proyek
const store = require('./store').open(DIR); // riwayat run (SQLite, atau JSON kalau node:sqlite tidak ada)
const { analyze } = require('./tokens'); // token per pemanggilan, cache ditulis ulang, output tool, limit
const tokenReport = require('./token-report');
const guard = require('./guard');
const { createRun, eqOf, rawOf, BOROS } = require('./run');
const { createRegistry } = require('./projects');
const agents = require('./agents');
const { summarize: backlogOf } = require('./backlog-summary');
const { summarize: attnSummary } = require('./attention');
const { safePath } = require('./usage');

let VERSION = '0.0.0';
try { VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version; } catch (_) { /* tanpa versi */ }
const norm = (n) => String(n || '').split(':').pop().trim();
const MAIN = '__main';

// Penonton SSE: { res, mode: 'p' | 'legacy' | 'list', p: id dari ?p=, key: kunci proyek bila sudah ketemu }.
const clients = new Set();

// 5.7: SessionStart memaksa katalog agent dipindai ulang; selain itu cache 30 dtk. refresh() dikembalikan false: definisi baru dipakai run berikutnya.
let freshAgents = false;
const catalog = { catalogFor: (key) => ({ ...(freshAgents ? agents.refresh(key) : agents.catalogFor(key)), refresh: () => false }) };
const reg = createRegistry({
  store, catalog,
  watched: (p) => [...clients].some((c) => c.p === p.id), // proyek yang sedang dilihat tidak dibuang dari memori
  runOpts: (p) => ({ usage: { refresh: refreshUsage }, backlog: () => backlogOf(p.key), onChange: (r) => { if (r === p.run) dirty(p); } }),
});

const rows = (project, n) => { try { return store ? store.list(project, n) : []; } catch (_) { return []; } };
function saveProject(p) { try { const r = store && p.run && p.run.row(p.key); if (r) store.save(r); } catch (_) { /* riwayat tidak boleh mengganggu viewer */ } }
process.on('exit', () => { try { reg.all().forEach(saveProject); } catch (_) {} });
['SIGINT', 'SIGTERM'].forEach((sg) => process.on(sg, () => process.exit(0)));

// ---------- events.jsonl dengan rotasi ----------
let logSize = 0;
try { logSize = fs.statSync(LOG_FILE).size; } catch (_) { /* belum ada */ }
function logEvent(ev) {
  const line = JSON.stringify({ ts: Date.now(), ...ev }) + '\n', n = Buffer.byteLength(line);
  if (logSize + n > LOG_MAX) { try { fs.renameSync(LOG_FILE, LOG_OLD); } catch (_) { /* tetap lanjut menulis */ } logSize = 0; }
  logSize += n;
  fs.appendFile(LOG_FILE, line, () => {});
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
// [SEC] Semua pembacaan transkrip (refreshUsage, agentUsage, rescanRun) lewat safePath: hanya .jsonl di bawah ~/.claude.
const readText = async (f) => { const p = await safePath(f); return p ? fs.promises.readFile(p, 'utf8').catch(() => null) : null; };

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
  if (!row) throw Object.assign(new Error('run tidak ada'), { status: 404, code: 'not_found' });
  if (liveIds().includes(id)) throw Object.assign(new Error('run live'), { status: 409, code: 'run_live' });
  const st = typeof row.state === 'string' ? JSON.parse(row.state) : row.state;
  // Batas atas = akhir run itu (tanpa kelonggaran): agent yang mulai beberapa detik setelahnya milik run berikutnya.
  const from = row.started_at - 1000, to = row.updated_at || Date.now();
  const mains = new Map(), agents = new Map(), segs = [];
  let open = null;
  for (const lf of [LOG_OLD, LOG_FILE]) if (fs.existsSync(lf)) { // log lama (hasil rotasi) lebih dulu
    const rl = readline.createInterface({ input: fs.createReadStream(lf, { encoding: 'utf8' }), crlfDelay: Infinity });
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
  writeTokenFile({ key: row.project });
  return st.tokensScan;
}

const parseJ = (x, d) => { if (x && typeof x === 'object') return x; try { return JSON.parse(x); } catch (_) { return d; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch (_) { return false; } };

// ---------- laporan token (8.1: key hanya dari registry/riwayat hasil resolve(p), tidak pernah dari URL) ----------
function tokenBuild(p, n = tokenReport.MAX_RUNS) {
  if (p.run) saveProject(p); // run live ikut terhitung
  const rs = rows(p.key, n);
  const runs = rs.map((r) => { const full = store.get(r.id) || {}; return { ...r, state: parseJ(full.state, {}), convo: parseJ(full.convo, []) }; });
  return { rows: rs.length, R: tokenReport.build(runs, p.key) };
}
// Folder sembarang dari event palsu tidak dianggap proyek: wajib docs/ atau .claude/, atau pernah ada sesi bertoken.
function knownProject(p) {
  if (!p || typeof p.key !== 'string' || p.key === '') return false;
  return isDir(path.join(p.key, 'docs')) || isDir(path.join(p.key, '.claude')) || rows(p.key, 200).some((r) => r.tokens_raw > 0);
}
// Salinan markdown untuk dibaca AI: <proyek>/.flow-viewer/laporan-token.md. Dilewati diam-diam bila gagal.
function writeTokenFile(p) {
  try {
    if (!knownProject(p)) return;
    const { rows: n, R } = tokenBuild(p);
    if (n) tokenReport.writeCopy(p.key, tokenReport.markdown(R));
  } catch (_) { /* laporan tidak boleh mengganggu viewer */ }
}
const tokenFileAt = new Map();
function writeTokenFileSoon(p) { const t = Date.now(); if (t - (tokenFileAt.get(p.key) || 0) < 60000) return; tokenFileAt.set(p.key, t); setTimeout(() => writeTokenFile(p), 3000); }

// ---------- snapshot per proyek ----------
// Blank: proyek tanpa run tersimpan, atau belum ada proyek sama sekali (kompatibel 1.7.1: /state selalu 200).
function blank(p) {
  const key = p ? p.key : '';
  const r = createRun({ key, catalog: catalog.catalogFor(key), project: { id: p ? p.id : '', name: p ? p.name : '(belum ada proyek)', shortPath: p ? p.shortPath : '' } });
  return { ...r.snapshot(), live: false, attention: [], lastEventAt: p ? p.lastEventAt : 0 };
}
// Proyek tidak aktif: run tersimpan terakhir, hanya baca, tanpa pemberitahuan (7.2 langkah 3).
function storedSnapshot(p) {
  const r = rows(p.key, 1)[0], full = r && store.get(r.id);
  if (!full) return blank(p);
  const { details, ...s } = parseJ(full.state, {});
  return {
    ...s, project: { id: p.id, name: p.name, shortPath: p.shortPath, path: p.key }, live: false, lastEventAt: p.lastEventAt || r.updated_at,
    phase: s.finished ? 'finished' : 'idle', attention: [], pending: null, pendings: [],
    progress: s.progress || { pct: null, label: '' }, tokens: s.tokens || { eq: null, prevEq: null, deltaPct: null, boros: false },
  };
}
function snapshotOf(p) {
  if (!p.run) return storedSnapshot(p);
  const s = { ...p.run.snapshot(), lastEventAt: p.lastEventAt };
  return reg.isActive(p) ? s : { ...s, live: false, attention: [] };
}

// ---------- /projects ----------
function overview() {
  const projects = reg.list().filter((p) => p.run).map((p) => {
    const s = p.run.snapshot(), a = attnSummary(s.attention);
    return {
      id: p.id, name: p.name, shortPath: p.shortPath, path: p.key, lastEventAt: p.lastEventAt, active: true, phase: s.phase,
      running: Object.values(s.nodes).filter((n) => n.status === 'running').map((n) => n.label || n.id),
      progress: s.progress, tokensEq: s.tokens.eq, attention: a,
    };
  });
  const needs = (x) => x.attention.input + x.attention.failed > 0;
  projects.sort((a, b) => (needs(b) - needs(a)) || b.lastEventAt - a.lastEventAt);
  const l = reg.latest();
  return { latest: l ? l.id : null, projects, inactive: reg.inactive() };
}

// ---------- siaran ----------
const write = (c, s) => { try { c.res.write(s); } catch (_) { clients.delete(c); } };
const timers = new Map(), lastPhase = new Map(), saveTimers = new Map();
// Tandai proyek berubah: satu siaran trailing per 250 ms per proyek, hanya ke penonton proyek itu (6).
function dirty(p) {
  scheduleProjects();
  if (timers.has(p.key)) return;
  timers.set(p.key, setTimeout(() => { timers.delete(p.key); fanout(p); }, THROTTLE_MS));
}
function fanout(p) {
  const to = [...clients].filter((c) => {
    if (c.mode === 'legacy') return reg.latest() === p; // /stream tanpa p: ikut proyek terbaru
    if (c.mode !== 'p') return false;
    if (!c.key) { const q = reg.resolve(c.p); if (q && q.key === p.key) c.key = p.key; } // p yang belum ada: kirim begitu muncul
    return c.key === p.key;
  });
  if (to.length) { const data = `data: ${JSON.stringify(snapshotOf(p))}\n\n`; to.forEach((c) => write(c, data)); }
  persist(p);
}
// 4.1: simpan tiap 3 dtk saat berubah, langsung saat fase berubah.
function persist(p) {
  const ph = p.run && p.run.phase;
  if (lastPhase.get(p.key) !== ph) { lastPhase.set(p.key, ph); clearTimeout(saveTimers.get(p.key)); saveTimers.delete(p.key); saveProject(p); return; }
  if (!saveTimers.has(p.key)) saveTimers.set(p.key, setTimeout(() => { saveTimers.delete(p.key); saveProject(p); }, 3000));
}
// event: projects ke semua penonton, maks 1/dtk, hanya bila isinya berubah.
let projTimer = null, projAt = 0, projLast = '';
function scheduleProjects() {
  if (projTimer || !clients.size) return;
  projTimer = setTimeout(() => {
    projTimer = null; projAt = Date.now();
    const s = JSON.stringify(overview());
    if (s === projLast) return;
    projLast = s;
    for (const c of clients) write(c, `event: projects\ndata: ${s}\n\n`);
  }, Math.max(0, projAt + 1000 - Date.now()));
}

// ---------- HTTP ----------
const sendErr = (res, e) => { res.writeHead(e.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.code, message: e.message })); };
const sendJson = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const E = {
  badP: { status: 400, code: 'bad_project', message: 'Parameter p tidak sah.' },
  noP: { status: 404, code: 'project_not_found', message: 'Proyek tidak dikenal.' },
  notLive: { status: 404, code: 'not_live', message: 'Proyek tidak aktif.' },
  badId: { status: 400, code: 'bad_id', message: 'Parameter id tidak sah.' },
};
// ?p= -> { p } (p bisa null: belum ada proyek aktif, tanpa ?p=) atau { err }.
function pick(q) {
  const raw = guard.parseP(q.get('p'));
  if (raw === false) return { err: E.badP };
  if (raw === null) return { p: reg.latest() };
  const p = reg.resolve(raw);
  return p ? { p } : { err: E.noP };
}
const runId = (q) => { const n = Number(q.get('id')); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const liveIds = () => reg.all().filter((p) => p.run).map((p) => p.run.id);

function handle(req, res) {
  const [url, qs = ''] = req.url.split('?');
  const q = new URLSearchParams(qs);
  for (const [k, v] of Object.entries(guard.SECURITY_HEADERS)) res.setHeader(k, v);
  res.setHeader('Cache-Control', 'no-store');
  // [SEC] DNS rebinding (Host) dan CSRF (Origin/Sec-Fetch-Site pada POST) untuk semua path.
  const bad = guard.checkRequest(req, PORT);
  if (bad) { req.resume(); return sendErr(res, bad); }
  const post = req.method === 'POST';

  if (post && url === '/event') {
    // Form/sendBeacon lintas situs hanya bisa mengirim text/plain tanpa preflight; hook selalu application/json.
    if (!/^application\/json(\s*;|$)/i.test(req.headers['content-type'] || '')) { req.resume(); return sendErr(res, { status: 415, code: 'bad_content_type', message: 'Content-Type wajib application/json.' }); }
    guard.readBody(req).then((body) => {
      let ev = null;
      try { ev = JSON.parse(body); } catch (_) { /* bad_json di bawah */ }
      if (!ev || typeof ev !== 'object' || Array.isArray(ev)) return sendErr(res, { status: 400, code: 'bad_json', message: 'Isi harus objek JSON.' });
      logEvent(ev);
      try {
        freshAgents = (ev.hook_event_name || ev.event) === 'SessionStart';
        const p = reg.ingest(ev);
        if (p) { dirty(p); if ((ev.hook_event_name || ev.event) === 'Stop') writeTokenFileSoon(p); } else scheduleProjects();
      } catch (e) { console.error('flow-viewer: event gagal diproses:', e && e.message); } finally { freshAgents = false; }
      res.writeHead(204); res.end(); // hook tidak boleh terblokir oleh galat di sini
    }).catch((e) => sendErr(res, e && e.status ? e : { status: 400, code: 'bad_json', message: 'Body tidak terbaca.' }));
    return;
  }
  if (post && url === '/reset') {
    const x = pick(q); if (x.err) return sendErr(res, x.err);
    if (!x.p) return sendErr(res, E.noP);
    const p = reg.reset(x.p.key); if (!p) return sendErr(res, E.notLive);
    dirty(p); res.writeHead(204); res.end(); return;
  }
  if (post && url === '/quit') { res.writeHead(200); res.end('bye'); setTimeout(() => process.exit(0), 100); return; }
  if (post && url === '/history/rescan') {
    const id = runId(q);
    if (!id) return sendJson(res, 400, { ok: false, error: 'rescan_failed' });
    rescanRun(id).then((r) => sendJson(res, 200, { ok: true, ...r }))
      .catch((err) => sendJson(res, err.status || 400, { ok: false, error: err.code || 'rescan_failed' }));
    return;
  }
  if (post && url === '/history/delete') {
    const id = runId(q); if (!id) return sendErr(res, E.badId);
    if (liveIds().includes(id)) return sendErr(res, { status: 409, code: 'run_live', message: 'Run sedang berjalan.' });
    let found = null;
    try { found = store && store.get(id); } catch (_) { /* dianggap tidak ada */ }
    if (!found) return sendErr(res, { status: 404, code: 'not_found', message: 'Run tidak ada.' });
    try { store.remove(id); } catch (_) { return sendErr(res, { status: 500, code: 'internal', message: 'Gagal menghapus.' }); }
    for (const p of reg.all()) if (p.run) { p.run.dropCompare(id); dirty(p); } // 7.5 butir 6: pembanding hilang -> siaran ulang
    res.writeHead(204); res.end(); return;
  }
  if (req.method !== 'GET') return sendErr(res, { status: 404, code: 'not_found', message: 'Tidak ada.' });

  if (url === '/health') return sendJson(res, 200, { ok: true, build: BUILD, version: VERSION });
  if (url === '/projects') return sendJson(res, 200, overview());
  if (url === '/state') {
    const x = pick(q); if (x.err) return sendErr(res, x.err);
    return sendJson(res, 200, x.p ? snapshotOf(x.p) : blank(null));
  }
  if (url === '/stream') {
    const raw = guard.parseP(q.get('p'));
    if (raw === false) return sendErr(res, E.badP);
    if (clients.size >= MAX_SSE) return sendErr(res, { status: 503, code: 'too_many_streams', message: 'Terlalu banyak tab terbuka.' });
    const c = { res, mode: q.get('list') === '1' ? 'list' : raw ? 'p' : 'legacy', p: raw, key: '' };
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    clients.add(c);
    res.on('close', () => clients.delete(c));
    const p = c.mode === 'p' ? reg.resolve(raw) : c.mode === 'legacy' ? reg.latest() : null;
    if (c.mode === 'p' && p) c.key = p.key;
    if (p || c.mode === 'legacy') write(c, `data: ${JSON.stringify(p ? snapshotOf(p) : blank(null))}\n\n`);
    write(c, `event: projects\ndata: ${JSON.stringify(overview())}\n\n`);
    return;
  }
  if (url === '/detail') {
    const x = pick(q); if (x.err) return sendErr(res, x.err);
    const raw = q.get('id'), id = raw === null ? MAIN : guard.parseNodeId(raw);
    if (!id) return sendErr(res, E.badId);
    if (!x.p) return sendErr(res, E.noP);
    if (!x.p.run) return sendErr(res, E.notLive);
    return sendJson(res, 200, x.p.run.detail(id));
  }
  if (url === '/report.md' || url === '/report') {
    const x = pick(q); if (x.err) return sendErr(res, x.err);
    if (!x.p) return sendErr(res, E.noP);
    if (!x.p.run) return sendErr(res, E.notLive);
    const text = x.p.run.report();
    if (url === '/report.md') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(text); return; }
    const esc = (t) => t.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="4"><title>Laporan Flow Viewer</title><body style="font:14px/1.5 ui-monospace,Consolas,monospace;background:#fff;color:#111;padding:16px"><pre style="white-space:pre-wrap;margin:0">${esc(text)}</pre></body>`);
    return;
  }
  if (url === '/report/tokens.md' || url === '/report/tokens.json') {
    // [SEC] p wajib (tanpa p tidak pernah jatuh ke proyek lain); folder dari registry, bukan dari URL.
    const raw = guard.parseP(q.get('p'));
    if (!raw) return sendErr(res, E.badP);
    const p = reg.resolve(raw);
    if (p && p.run) saveProject(p);
    if (!p || !knownProject(p)) return sendErr(res, E.noP);
    try {
      const { rows: n, R } = tokenBuild(p, Math.min(tokenReport.MAX_RUNS, Number(q.get('n')) || tokenReport.MAX_RUNS));
      if (!n) return sendErr(res, { status: 404, code: 'no_runs', message: 'Belum ada run untuk dilaporkan.' });
      if (q.get('write') !== '0' && !q.get('n')) tokenReport.writeCopy(p.key, tokenReport.markdown(R));
      if (url.endsWith('.json')) return sendJson(res, 200, { ...R, project: { id: p.id, name: p.name }, unanalyzed: R.missing });
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(tokenReport.markdown(R));
    } catch (_) { sendErr(res, { status: 500, code: 'report_failed', message: 'Laporan gagal dibuat.' }); } // err.message bisa memuat path lokal
    return;
  }
  if (url === '/history') {
    const x = pick(q); if (x.err) return sendErr(res, x.err);
    const p = x.p, all = q.get('all') === '1';
    const list = rows(all || !p ? '' : p.key, 60).map((r) => {
      let prev = null;
      try { prev = store.previous(r.project, r.flow, r.id, r.agents_ran > 0); } catch (_) { /* tanpa pembanding */ }
      const pe = prev && prev.tokens_eq > 0 ? prev.tokens_eq : null;
      return { ...r, projectId: reg.idFor(r.project), deltaPct: pe && r.tokens_eq > 0 ? Math.round((r.tokens_eq - pe) / pe * 100) : null, boros: !!pe && r.tokens_eq > BOROS * pe };
    });
    let groups = [];
    try { groups = (store ? store.projects() : []).slice(0, 50).map((g) => ({ projectId: reg.idFor(g.project), name: path.basename(g.project) || g.project, count: g.count })); } catch (_) { /* tanpa grup */ }
    return sendJson(res, 200, { kind: store ? store.kind : 'none', current: p ? p.key : '', liveIds: liveIds(), liveId: p && p.run ? p.run.id : null, groups, rows: list });
  }
  if (url === '/history/get') {
    const id = runId(q); if (!id) return sendErr(res, E.badId);
    const live = reg.all().find((p) => p.run && p.run.id === id);
    if (live) saveProject(live);
    let r = null;
    try { r = store && store.get(id); } catch (_) { /* dianggap tidak ada */ }
    if (!r) return sendErr(res, { status: 404, code: 'not_found', message: 'Run tidak ada.' });
    return sendJson(res, 200, { id: r.id, project: r.project, state: parseJ(r.state, {}), convo: parseJ(r.convo, []) });
  }
  const sp = guard.staticPath(url === '/' ? '/index.html' : url);
  if (sp) {
    let ok = false;
    try { ok = fs.statSync(sp.file).isFile(); } catch (_) { /* 404 di bawah */ }
    if (ok) { res.writeHead(200, { 'Content-Type': sp.type }); fs.createReadStream(sp.file).on('error', () => res.destroy()).pipe(res); return; }
  }
  sendErr(res, { status: 404, code: 'not_found', message: 'Tidak ada.' });
}

const BUILD = require('./build-id')();
const server = http.createServer((req, res) => {
  try { handle(req, res); } catch (e) {
    console.error('flow-viewer:', e && e.stack); // detail hanya di log, tidak ke klien
    if (!res.headersSent) sendErr(res, { status: 500, code: 'internal', message: 'Galat server.' }); else res.end();
  }
});

setInterval(() => { for (const c of clients) write(c, ': ping\n\n'); }, 20000);
// Fase run ditentukan jam (2 dtk sepi, 5.1): periksa tiap 0,5 dtk.
setInterval(() => { for (const p of reg.list()) if (p.run && p.run.tick()) dirty(p); }, 500).unref();
// Sapuan 30 dtk: tandai proyek kotor bila ada agent baru melewati batas diam (5.3), buang proyek lama dari memori.
const quietSig = new Map();
setInterval(() => {
  for (const p of reg.list()) {
    if (!p.run) continue;
    const sig = Object.values(p.run.snapshot().nodes).filter((n) => n.quiet).map((n) => n.id).join(',');
    if (sig !== (quietSig.get(p.key) || '')) { quietSig.set(p.key, sig); dirty(p); }
  }
  reg.sweep(); scheduleProjects();
}, 30000).unref();
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`flow-viewer: port ${PORT} sudah dipakai (mungkin sudah jalan)`); process.exit(0); }
  throw err;
});
server.listen(PORT, '127.0.0.1', () => console.log(`flow-viewer: http://localhost:${PORT}`));
