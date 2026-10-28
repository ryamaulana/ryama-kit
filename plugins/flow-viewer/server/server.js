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

const FLOW_CMD = /\/(?:fullstack-dev:)?(build|start|run|backlog|boilerplate|ui-only|fe-only|prd-check|ui-direction)\b[ \t]*([\w-]*)/;
const norm = (n) => String(n || '').split(':').pop().trim();
const base = (p) => String(p || '').split(/[\\/]/).pop();
const MAIN = '__main';

let state = null;
let fileSets = {};
let lifecycleSeen = false; // true once any SubagentStart/Stop arrives; then PostToolUse(Agent) is not trusted to mean "finished"
let details = {};   // key (agent id or __main) -> { events, files, task, result, agentIds }
let evIndex = {};   // tool_use_id -> { key, rec }
let usageAt = {};   // key -> last usage refresh time
let convo = [];     // percakapan: prompt user, jawaban Claude, pertanyaan, izin, error
let pending = null; // sesuatu yang sedang menunggu user: { kind: question|permission|idle, text, at }
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
  const name = get('name') || path.basename(file, '.md');
  const skills = get('skills').replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  return { name, model: get('model'), effort: get('effort'), tools: get('tools'), skills, description: get('description').slice(0, 220) };
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

function applyDef(n) {
  const d = agentDefs[n.id];
  if (!d) return;
  n.model = d.model || 'inherit'; n.effort = d.effort || '';
  n.desc = d.description; n.toolsAllowed = d.tools; n.skillsDef = d.skills;
}

const aliasOf = (m) => /opus/i.test(m) ? 'opus' : /sonnet/i.test(m) ? 'sonnet' : /haiku/i.test(m) ? 'haiku' : '';
// Does the model seen in the agent's own transcript match what its definition asks for?
function modelCheck(n) {
  const actual = (n.usage && n.usage.model) || n.resolvedModel;
  n.modelSrc = n.usage && n.usage.model ? 'transcript' : n.resolvedModel ? 'peluncuran' : '';
  if (!actual || !n.model) return 'unverified';
  if (n.model === 'inherit') { const mm = state.main.model; return mm ? (mm === actual ? 'ok' : 'mismatch') : 'unverified'; }
  if (n.model === actual) return 'ok';
  return aliasOf(actual) && aliasOf(actual) === aliasOf(n.model) ? 'ok' : 'mismatch';
}

function mkNode(id, def = {}, extra = false) {
  const n = {
    id, role: def.role || '', optional: !!def.optional, extra,
    status: 'idle', count: 0, tools: 0, files: 0, skills: [], last: '', recent: [],
    background: false, offscope: false, segments: [], startedAt: null, endedAt: null, ms: 0,
    model: '', desc: '', toolsAllowed: '', skillsDef: [], usage: null,
  };
  applyDef(n);
  return n;
}

const eqOf = (u) => u ? Math.round((u.in || 0) + (u.cc || 0) * 1.25 + (u.cr || 0) * 0.1 + (u.out || 0) * 5) : 0;
const rawOf = (u) => u ? (u.in || 0) + (u.out || 0) + (u.cr || 0) + (u.cc || 0) : 0;
let persistT = null;
function flushRun() {
  clearTimeout(persistT); persistT = null;
  try {
    if (!store || !state) return;
    const nodes = Object.values(state.nodes);
    const ran = nodes.filter((n) => n.count > 0).length;
    if (!state.promptAt && !convo.length && !ran) return; // run kosong tidak disimpan
    const eq = nodes.reduce((a, n) => a + eqOf(n.usage), 0) + eqOf(state.main.usage);
    const raw = nodes.reduce((a, n) => a + rawOf(n.usage), 0) + rawOf(state.main.usage);
    store.save({
      id: state.runId, project: cwdNow || '', flow: state.flow, title: state.title || '', prompt: String(state.prompt || '').slice(0, 600),
      started_at: state.startedAt, updated_at: Date.now(), finished: state.finished ? 1 : 0, tokens_eq: eq, tokens_raw: raw, agents_ran: ran,
      files: (state.fileList || []).length, state: JSON.stringify(state), convo: JSON.stringify(convo.filter((m) => m.t >= state.startedAt - 1000).slice(-300)),
    });
  } catch (_) { /* riwayat tidak boleh mengganggu viewer */ }
}
function persistSoon() { if (!store || persistT) return; persistT = setTimeout(flushRun, 1500); }
process.on('exit', () => { try { flushRun(); } catch (_) {} });
['SIGINT', 'SIGTERM'].forEach((sg) => process.on(sg, () => process.exit(0)));

function newRun(key) {
  flushRun();
  const k = FLOWS[key] ? key : 'free';
  const f = FLOWS[k];
  const ov = FLOWS.free; // overview = the full crew, always shown so the graph is never empty
  const nodes = {};
  ov.nodes.forEach((n) => { nodes[n.id] = mkNode(n.id, n); });
  if (k !== 'free') {
    Object.values(nodes).forEach((n) => { n.offscope = true; n.optional = false; });
    f.nodes.forEach((n) => { nodes[n.id] = mkNode(n.id, n); });
  }
  fileSets = {}; details = {}; evIndex = {}; usageAt = {};
  state = {
    flow: k, title: f.title, runId: Date.now(), startedAt: Date.now(), finished: false,
    expected: k === 'free' ? [] : f.nodes.map((n) => n.id), edges: f.edges, nodes,
    crew: ov.nodes.map((n) => n.id), crewMeta: ov.nodes.map((n) => ({ id: n.id, col: n.col, row: n.row })), crewEdges: ov.edges,
    prompt: state ? state.prompt : '', promptAt: state ? state.promptAt : null,
    main: { status: 'idle', tools: 0, last: '', recent: [], usage: null, model: '' },
    log: state ? state.log : [], mainSkills: [], skillCalls: [],
  };
}

function addLog(kind, text) {
  state.log.unshift({ t: Date.now(), kind, text });
  if (state.log.length > 200) state.log.length = 200;
}

function getNode(id) {
  if (!state.nodes[id]) state.nodes[id] = mkNode(id, {}, true);
  return state.nodes[id];
}

function openSegment(n, now) { n.segments.push({ s: now, e: null }); }
function closeSegment(n, now) {
  const seg = n.segments[n.segments.length - 1];
  if (seg && seg.e === null) seg.e = now;
}

function start(id, opts = {}) {
  if (!id) return;
  const n = getNode(id);
  if (opts.background) n.background = true;
  if (n.status === 'running') return; // dedupe SubagentStart + PreToolUse(Agent)
  const now = Date.now();
  n.status = 'running'; n.count += 1; n.startedAt = now; n.last = 'mulai';
  openSegment(n, now);
  state.finished = false;
  addLog('start', `${id} mulai${n.background ? ' (background)' : ''}${n.count > 1 ? ` (putaran ${n.count})` : ''}`);
}

function stop(id) {
  if (!id) return;
  const n = getNode(id);
  if (n.status !== 'running') return;
  const now = Date.now();
  n.status = 'done'; n.endedAt = now; n.ms += now - n.startedAt;
  closeSegment(n, now);
  addLog('done', `${id} selesai`);
  maybeFinalize();
}

// An agent that is emitting tool events is alive, whatever we thought before (self-heal).
function ensureRunning(id) {
  const n = getNode(id);
  if (n.status === 'running') return n;
  const now = Date.now();
  n.status = 'running'; n.startedAt = now; if (n.count === 0) n.count = 1;
  openSegment(n, now);
  state.finished = false;
  return n;
}

function pushRecent(list, text) {
  list.unshift({ t: Date.now(), text });
  if (list.length > 4) list.length = 4;
}

function skill(name, agent) {
  if (!name) return;
  if (agent) {
    const n = getNode(agent);
    if (!n.skills.includes(name)) n.skills.push(name);
  } else if (!state.mainSkills.includes(name)) state.mainSkills.push(name);
  state.skillCalls.unshift({ t: Date.now(), name: String(name).replace(/^.*:/, ''), agent: agent || '' });
  if (state.skillCalls.length > 40) state.skillCalls.length = 40;
  addLog('skill', `skill ${name}${agent ? ` (oleh ${agent})` : ' (sesi utama)'}`);
}

function describe(tool, input) {
  const f = base(input.file_path || input.path || input.notebook_path);
  if (f) return `${tool} ${f}`;
  if (input.command) return `${tool} ${String(input.command).slice(0, 48)}`;
  if (input.pattern) return `${tool} ${String(input.pattern).slice(0, 48)}`;
  if (input.url) return `${tool} ${String(input.url).slice(0, 48)}`;
  return tool;
}

function activity(agent, tool, input) {
  const text = describe(tool, input);
  if (!agent) {
    state.main.tools += 1; state.main.last = text; pushRecent(state.main.recent, text);
    return;
  }
  const n = ensureRunning(agent);
  n.tools += 1; n.last = text; pushRecent(n.recent, text);
  const f = input.file_path || input.notebook_path;
  if (f && /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(tool)) {
    (fileSets[agent] = fileSets[agent] || new Set()).add(f);
    n.files = fileSets[agent].size;
  }
}

// ---------- per-node detail (what Claude Code shows: commands, diffs, results) ----------
const cap = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + `\n… (+${s.length - n} karakter lagi)` : s; };
const nlines = (s) => (s ? String(s).replace(/\n$/, '').split('\n').length : 0);
function det(key) {
  return details[key] || (details[key] = { events: [], files: {}, task: '', taskDesc: '', result: '', agentIds: [] });
}

function say(kind, text, extra) {
  const t = String(text == null ? '' : text).trim();
  if (!t && !(extra && extra.questions)) return;
  convo.push(Object.assign({ t: Date.now(), kind, text: cap(t, kind === 'claude' ? 6000 : 3000) }, extra || {}));
  if (convo.length > 150) convo.shift();
}
const setPending = (kind, text) => { pending = { kind, text: cap(text, 500), at: Date.now() }; };
const clearPending = () => { pending = null; };

function sanitize(tool, i) {
  switch (tool) {
    case 'Edit': return { file: i.file_path, old: cap(i.old_string, 1800), new: cap(i.new_string, 1800), all: !!i.replace_all };
    case 'MultiEdit': return { file: i.file_path, edits: (i.edits || []).slice(0, 8).map((e) => ({ old: cap(e.old_string, 900), new: cap(e.new_string, 900) })) };
    case 'Write': return { file: i.file_path, content: cap(i.content, 3000), lines: nlines(i.content) };
    case 'NotebookEdit': return { file: i.notebook_path, new: cap(i.new_source, 1800) };
    case 'Bash': return { command: cap(i.command, 900), desc: cap(i.description, 200), bg: !!i.run_in_background };
    case 'Read': return { file: i.file_path, offset: i.offset, limit: i.limit };
    case 'Grep': case 'Glob': return { pattern: i.pattern, path: i.path, glob: i.glob };
    case 'Agent': case 'Task': return { agent: norm(i.subagent_type), desc: cap(i.description, 200), prompt: cap(i.prompt, 3000), bg: !!i.run_in_background };
    case 'Skill': return { skill: i.skill || i.name || i.command, args: cap(i.args, 300) };
    case 'WebFetch': return { url: i.url, prompt: cap(i.prompt, 300) };
    case 'WebSearch': return { query: i.query };
    default: return { raw: cap(JSON.stringify(i), 500) };
  }
}

function trackFile(d, tool, input, rec) {
  const edits = [];
  if (tool === 'Write') edits.push({ f: input.file_path, add: nlines(input.content), del: 0, created: true });
  else if (tool === 'Edit') edits.push({ f: input.file_path, add: nlines(input.new_string), del: nlines(input.old_string) });
  else if (tool === 'MultiEdit') (input.edits || []).forEach((e) => edits.push({ f: input.file_path, add: nlines(e.new_string), del: nlines(e.old_string) }));
  else if (tool === 'NotebookEdit') edits.push({ f: input.notebook_path, add: nlines(input.new_source), del: 0 });
  edits.forEach((e) => {
    if (!e.f) return;
    const x = d.files[e.f] || (d.files[e.f] = { path: e.f, add: 0, del: 0, edits: 0, created: false, evIds: [] });
    x.add += e.add; x.del += e.del; x.edits += 1; if (e.created) x.created = true;
    if (!x.evIds.includes(rec.id)) x.evIds.push(rec.id);
  });
}

function recordTool(key, ev) {
  const d = det(key);
  const input = ev.tool_input || {};
  const rec = {
    id: ev.tool_use_id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    t: Date.now(), tool: ev.tool_name, summary: describe(ev.tool_name, input),
    input: sanitize(ev.tool_name, input), status: 'pending', ms: null, out: '',
  };
  d.events.push(rec);
  if (d.events.length > 400) d.events.shift();
  evIndex[rec.id] = { key, rec };
  trackFile(d, ev.tool_name, input, rec);
}

function respText(r) {
  if (r == null) return '';
  if (typeof r === 'string') return r;
  if (Array.isArray(r)) return r.map(respText).filter(Boolean).join('\n');
  if (r.stdout !== undefined || r.stderr !== undefined) return [r.stdout, r.stderr].filter(Boolean).join('\n');
  if (r.content !== undefined) return respText(r.content);
  if (r.text) return r.text;
  if (r.file && r.file.content) return r.file.content;
  return JSON.stringify(r);
}

function recordPost(ev) {
  const hit = evIndex[ev.tool_use_id];
  if (!hit) return;
  const r = ev.tool_response;
  const rec = hit.rec;
  rec.status = (r && typeof r === 'object' && (r.is_error || r.error || r.interrupted)) ? 'error' : 'ok';
  rec.ms = Date.now() - rec.t;
  const text = respText(r);
  if (rec.status === 'error') say('error', `${rec.tool}: ${cap(respText(r), 500)}`, { agent: hit.key === MAIN ? '' : hit.key });
  rec.out = rec.tool === 'Read' ? `${nlines(text)} baris dibaca` : /^(Write|Edit|MultiEdit)$/.test(rec.tool) ? cap(text, 200) : cap(text, 1200);
  if (rec.tool === 'Agent' || rec.tool === 'Task') {
    let obj = r && typeof r === 'object' ? r : null;
    if (!obj) { try { obj = JSON.parse(text); } catch (_) { obj = null; } }
    const aid = norm(rec.input.agent);
    if (obj && obj.resolvedModel && state.nodes[aid]) state.nodes[aid].resolvedModel = String(obj.resolvedModel);
    const launch = obj && (obj.isAsync || obj.status === 'async_launched');
    if (!launch && !rec.input.bg) { const d = det(aid); if (!d.result) d.result = cap(text, 6000); }
    if (launch) rec.out = 'agent diluncurkan di latar belakang' + (obj.resolvedModel ? ` (model ${obj.resolvedModel})` : '');
  }
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
  if (ev.agent_transcript_path) cands.push(ev.agent_transcript_path);
  if (tp && agentId) {
    const dir = path.dirname(tp), sid = ev.session_id || path.basename(tp, '.jsonl');
    cands.push(path.join(dir, sid, 'subagents', `agent-${agentId}.jsonl`), path.join(dir, `agent-${agentId}.jsonl`));
  }
  for (const f of cands) {
    const t = await readText(f);
    if (t) { const u = parseUsage(t, null, names); if (u.turns) return u; }
  }
  if (tp && agentId) { // older layout: sidechain messages live inside the main transcript
    const t = await readText(tp);
    if (t) { const u = parseUsage(t, (o) => o.isSidechain && o.agentId === agentId, names); if (u.turns) return u; }
  }
  return null;
}

async function refreshUsage(key, ev, force) {
  if (!state || !ev.transcript_path) return;
  const now = Date.now();
  if (!force && usageAt[key] && now - usageAt[key] < 4000) return;
  usageAt[key] = now;
  try {
    if (key === MAIN) {
      const t = await readText(ev.transcript_path);
      if (!t) return;
      const allNames = [...new Set([...Object.values(state.nodes).flatMap((x) => x.skillsDef || []), 'caveman'])];
      const u = parseUsage(t, (o) => !o.isSidechain, allNames);
      if (u.turns) { state.main.usage = u; state.main.model = u.model; }
    } else {
      const n = state.nodes[key], d = details[key];
      if (!n || !d || !d.agentIds.length) return;
      const sum = { in: 0, out: 0, cr: 0, cc: 0, turns: 0, model: '', ctx: 0, audits: 0, skillEv: {}, imgReads: 0, imgUniq: 0, dupReads: 0 };
      let any = false;
      for (const id of d.agentIds) {
        const u = await agentUsage(ev, id, [...new Set([...(n.skillsDef || []), 'caveman'])]);
        if (!u) continue;
        any = true;
        sum.in += u.in; sum.out += u.out; sum.cr += u.cr; sum.cc += u.cc; sum.turns += u.turns; sum.audits += u.audits; Object.assign(sum.skillEv, u.skillEv); sum.imgReads += u.imgReads; sum.imgUniq += u.imgUniq; sum.dupReads += u.dupReads;
        sum.model = u.model || sum.model; sum.ctx = u.ctx;
      }
      if (any) n.usage = sum;
    }
    broadcast();
  } catch (_) { /* best effort */ }
}

// Mark the run finished only when the main session is idle AND no agent is still running
// (background agents keep running after the main session's Stop).
function maybeFinalize() {
  const anyRunning = Object.values(state.nodes).some((n) => n.status === 'running');
  if (anyRunning || state.main.status === 'running') return;
  for (const n of Object.values(state.nodes)) {
    if (state.expected.length && n.status === 'idle' && !n.extra && !n.offscope) n.status = n.optional ? 'optional' : 'skipped';
  }
  state.finished = true;
}

function handle(ev) {
  const e = ev.hook_event_name || ev.event;
  const tool = ev.tool_name;
  const input = ev.tool_input || {};
  const agent = norm(ev.agent_type);
  const key = agent || MAIN;
  if (ev.cwd) cwdNow = ev.cwd;
  if (ev.cwd && !scannedDirs.has(path.join(ev.cwd, '.claude', 'agents'))) {
    loadAgentDefs(ev.cwd);
    Object.values(state.nodes).forEach((n) => { if (!n.model) applyDef(n); });
  }
  if (agent && ev.agent_id) { const ids = det(agent).agentIds; if (!ids.includes(ev.agent_id)) ids.push(ev.agent_id); }
  switch (e) {
    case 'UserPromptSubmit': {
      const text = String(ev.prompt || '').replace(/\s+/g, ' ').trim();
      if (/^<(agent-message|task-notification|system-reminder)\b/i.test(text)) { // sistem menyuntik pesan (mis. agent latar selesai), bukan ketikan user
        say('notify', 'notifikasi sistem: ' + cap(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 200));
        addLog('stop', 'notifikasi agent masuk');
        state.main.status = 'running'; state.finished = false;
        break;
      }
      const m = FLOW_CMD.exec(text);
      if (m) {
        const k = m[1] === 'build' ? m[2] : m[1];
        if (FLOWS[k]) { newRun(k); addLog('flow', `flow: ${k}`); }
      }
      state.prompt = text.slice(0, 160); state.promptAt = Date.now();
      say('user', String(ev.prompt || ''));
      clearPending();
      state.main.status = 'running'; state.finished = false;
      addLog('prompt', `prompt: ${text.slice(0, 70)}`);
      break;
    }
    case 'SubagentStart': {
      lifecycleSeen = true; start(norm(ev.agent_type));
      if (ev.agent_id && norm(ev.agent_type)) { const ids = det(norm(ev.agent_type)).agentIds; if (!ids.includes(ev.agent_id)) ids.push(ev.agent_id); }
      break;
    }
    case 'SubagentStop': {
      lifecycleSeen = true;
      const id = norm(ev.agent_type);
      if (id && ev.agent_id) { const ids = det(id).agentIds; if (!ids.includes(ev.agent_id)) ids.push(ev.agent_id); }
      if (id && ev.last_assistant_message) { det(id).result = cap(ev.last_assistant_message, 6000); say('agent', ev.last_assistant_message, { agent: id }); }
      stop(id);
      refreshUsage(id, ev, true);
      break;
    }
    case 'PreToolUse':
      recordTool(key, ev);
      if (tool === 'AskUserQuestion') {
        const qs = (input.questions || []).slice(0, 4).map((q) => ({ question: cap(q.question, 400), header: q.header, multi: !!q.multiSelect, options: (q.options || []).slice(0, 6).map((o) => ({ label: cap(o.label, 120), description: cap(o.description, 200) })) }));
        say('question', qs.map((q) => q.question).join('\n'), { agent: agent || '', questions: qs });
        setPending('question', qs.length ? qs[0].question : 'Claude bertanya');
      }
      if (tool === 'Agent' || tool === 'Task') {
        const id = norm(input.subagent_type);
        start(id, { background: !!input.run_in_background });
        if (id) { const d = det(id); d.task = cap(input.prompt, 4000); d.taskDesc = cap(input.description, 200); }
        activity(agent, tool, input);
      } else if (tool === 'Skill') { skill(input.skill || input.name || input.command, agent); activity(agent, tool, input); }
      else activity(agent, tool, input);
      refreshUsage(key, ev, false);
      break;
    case 'PostToolUse':
      recordPost(ev);
      if (tool === 'AskUserQuestion') say('answer', respText(ev.tool_response), { agent: agent || '' });
      clearPending();
      // For a background agent this fires immediately at launch, so it must NOT mean "finished".
      if ((tool === 'Agent' || tool === 'Task') && !input.run_in_background && !lifecycleSeen) {
        stop(norm(input.subagent_type));
      }
      break;
    case 'Stop':
      state.main.status = 'idle'; addLog('stop', 'sesi utama selesai giliran'); maybeFinalize();
      if (ev.last_assistant_message) say('claude', ev.last_assistant_message);
      clearPending();
      refreshUsage(MAIN, ev, true);
      break;
    case 'PermissionRequest': {
      const txt = `${tool || 'tool'}: ${describe(tool || '', input).replace(/^\w+ ?/, '')}`;
      say('permission', txt, { agent: agent || '' });
      setPending('permission', `Izin dibutuhkan: ${txt}`);
      addLog('perm', `menunggu izin: ${txt.slice(0, 60)}`);
      break;
    }
    case 'Notification': {
      const msg = String(ev.message || ''), nt = String(ev.notification_type || '');
      say('notify', msg);
      if (/permission/i.test(nt + msg)) setPending('permission', msg);
      else if (/idle|waiting/i.test(nt + msg)) setPending('idle', msg);
      break;
    }
    case 'SessionStart': addLog('session', 'sesi dimulai'); refreshUsage(MAIN, ev, true); break;
    default: return false;
  }
  return true;
}

let cwdNow = '', blCache = { key: '', val: null };
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
  state.backlog = backlogSummary();
  state.updatedAt = Date.now();
  state.pending = pending; state.convoN = convo.length;
  const fl = [];
  Object.entries(details).forEach(([k, d]) => Object.values(d.files || {}).forEach((f) => fl.push({ agent: k, path: f.path, add: f.add, del: f.del, created: !!f.created })));
  state.fileList = fl.slice(-40);
  Object.values(state.nodes).forEach((n) => { const d = details[n.id]; n.modelCheck = modelCheck(n); n.snippet = d && d.result ? cap(d.result.replace(/\s+/g, ' '), 240) : ''; });
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const c of clients) c.write(data);
  persistSoon();
}

function detailFor(id) {
  if (id === '__convo') return { id, title: 'Percakapan', convo, pending };
  if (id === '__all') {
    const files = [];
    for (const [key, d] of Object.entries(details)) {
      Object.values(d.files).forEach((f) => files.push({ ...f, agent: key === MAIN ? 'Claude' : key }));
    }
    const events = [];
    for (const [key, d] of Object.entries(details)) {
      d.events.forEach((r) => { if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(r.tool)) events.push({ ...r, agent: key === MAIN ? 'Claude' : key }); });
    }
    events.sort((a, b) => a.t - b.t);
    return { id, title: 'Semua file yang diubah', files, events };
  }
  const d = det(id);
  const n = id === MAIN ? null : state.nodes[id];
  return {
    id, title: id === MAIN ? 'Claude (sesi utama)' : id,
    mainModel: state.main.model || '', node: n ? { role: n.role, desc: n.desc, model: n.model, effort: n.effort, modelCheck: n.modelCheck, modelSrc: n.modelSrc, resolvedModel: n.resolvedModel, toolsAllowed: n.toolsAllowed, skillsDef: n.skillsDef, skills: n.skills, usage: n.usage, status: n.status, count: n.count, ms: n.status === 'running' ? n.ms + (Date.now() - n.startedAt) : n.ms, background: n.background, extra: n.extra } : { role: 'sesi utama (orchestrator)', model: state.main.model, usage: state.main.usage, skills: state.mainSkills, status: state.main.status },
    task: d.task, taskDesc: d.taskDesc, result: d.result,
    events: d.events, files: Object.values(d.files),
    usageNote: (n ? n.usage : state.main.usage) ? '' : 'Token belum terbaca. Hook belum mengirim transcript_path, atau file transcript agent ini belum ditemukan (cek ~/.claude/flow-viewer/events.jsonl).',
  };
}

function report() {
  const hm = (t) => new Date(t).toLocaleTimeString('id-ID', { hour12: false });
  const nodes = Object.values(state.nodes);
  const running = nodes.filter((n) => n.status === 'running');
  const L = [];
  L.push(`# Laporan Flow Viewer (diperbarui ${hm(Date.now())})`);
  let st;
  if (pending) st = `MENUNGGU KAMU (${pending.kind}): ${pending.text}`;
  else if (running.length) st = `BEKERJA: agent berjalan: ${running.map((n) => n.id).join(', ')}`;
  else if (state.main.status === 'running') st = 'BEKERJA: sesi utama';
  else st = 'IDLE: giliran selesai, menunggu prompt berikutnya';
  L.push(`STATUS: ${st}`);
  const exp = state.expected.map((i) => state.nodes[i]).filter((n) => n && !n.optional);
  if (state.expected.length) {
    const ran = exp.filter((n) => n.count > 0), miss = exp.filter((n) => n.count === 0);
    L.push(`FLOW: ${state.flow} | langkah wajib jalan ${ran.length}/${exp.length}${state.finished && miss.length ? ' | DILEWATI: ' + miss.map((n) => n.id).join(', ') : ''}`);
  } else L.push('FLOW: overview (belum ada command flow)');
  L.push(`PROMPT TERAKHIR: ${state.prompt || '-'}`);
  if (pending && pending.kind === 'question') {
    const q = [...convo].reverse().find((c) => c.kind === 'question');
    if (q && q.questions) {
      L.push('', '## Pertanyaan yang menunggu jawaban');
      q.questions.forEach((x, i) => { L.push(`${i + 1}. ${x.question}${x.multi ? ' (boleh pilih lebih dari satu)' : ''}`); x.options.forEach((o) => L.push(`   - ${o.label}${o.description ? ': ' + o.description : ''}`)); });
    }
  }
  L.push('', '## Agent');
  L.push('nama | status | model dideklarasi | model terbaca di transcript | cek | effort | token | tool | file | aktivitas terakhir');
  nodes.filter((n) => n.count > 0 || n.status !== 'idle' || n.extra).forEach((n) => {
    const u = n.usage; const tok = u ? u.in + u.out + u.cr + u.cc : 0;
    L.push(`${n.id} | ${n.status}${n.background ? ' (BG)' : ''} | ${n.model || '-'} | ${(u && u.model) || 'belum terbaca'} | ${n.modelCheck || modelCheck(n)} | ${n.effort || 'tidak diatur'} | ${tok || '-'} | ${n.tools} | ${n.files} | ${n.last || '-'}`);
  });
  if (!nodes.some((n) => n.count > 0)) L.push('(belum ada agent yang jalan)');
  const u0 = state.main.usage;
  L.push(`Claude (sesi utama) | ${state.main.status} | ${state.main.model || '-'} | ${u0 ? u0.in + u0.out + u0.cr + u0.cc : '-'} | ${state.main.tools} | - | ${state.main.last || '-'}`);
  const files = [];
  for (const [k, d] of Object.entries(details)) Object.values(d.files).forEach((f) => files.push(`${k === MAIN ? 'Claude' : k}: ${f.path} (+${f.add} -${f.del})`));
  if (files.length) { L.push('', '## File diubah'); files.slice(0, 25).forEach((f) => L.push('- ' + f)); }
  const errs = convo.filter((c) => c.kind === 'error').slice(-5);
  if (errs.length) { L.push('', '## Error terbaru'); errs.forEach((c) => L.push(`[${hm(c.t)}] ${c.agent ? c.agent + ': ' : ''}${c.text}`)); }
  const LBL = { user: 'USER', claude: 'CLAUDE', agent: 'AGENT', question: 'PERTANYAAN', answer: 'JAWABAN USER', permission: 'MINTA IZIN', notify: 'NOTIF', error: 'ERROR' };
  L.push('', '## Percakapan terakhir (lama ke baru)');
  convo.slice(-14).forEach((c) => L.push(`[${hm(c.t)}] ${LBL[c.kind] || c.kind}${c.agent ? ' ' + c.agent : ''}: ${cap(c.text, 700).replace(/\n/g, '\n    ')}`));
  if (!convo.length) L.push('(belum ada)');
  return L.join('\n');
}

const BUILD = require('./build-id')();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'POST' && url === '/event') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4e6) req.destroy(); });
    req.on('end', () => {
      try {
        const ev = JSON.parse(body);
        fs.appendFile(LOG_FILE, JSON.stringify({ ts: Date.now(), ...ev }) + '\n', () => {});
        if (handle(ev)) broadcast();
      } catch (_) { /* ignore malformed */ }
      res.writeHead(204); res.end();
    });
    return;
  }
  if (req.method === 'POST' && url === '/reset') {
    newRun(state.flow); convo = []; pending = null; state.prompt = ''; state.promptAt = null; broadcast(); res.writeHead(204); res.end(); return;
  }
  if (url === '/report.md') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(report()); return; }
  if (url === '/report') {
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="4"><title>Laporan Flow Viewer</title><body style="font:14px/1.5 ui-monospace,Consolas,monospace;background:#fff;color:#111;padding:16px"><pre style="white-space:pre-wrap;margin:0">${esc(report())}</pre></body>`);
    return;
  }
  if (url === '/history') {
    const q = new URLSearchParams(req.url.split('?')[1] || '');
    let rows = [];
    try { if (store) rows = store.list(q.get('all') === '1' ? '' : cwdNow, 60); } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ kind: store ? store.kind : 'none', current: cwdNow || '', liveId: state.runId, rows }));
    return;
  }
  if (url === '/history/get') {
    const id = Number(new URLSearchParams(req.url.split('?')[1] || '').get('id'));
    let r = null;
    try { if (store && id === state.runId) flushRun(); r = store && id ? store.get(id) : null; } catch (_) {}
    if (!r) { res.writeHead(404); res.end('{}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: r.id, project: r.project, state: JSON.parse(r.state), convo: JSON.parse(r.convo || '[]') }));
    return;
  }
  if (req.method === 'POST' && url === '/history/delete') {
    const id = Number(new URLSearchParams(req.url.split('?')[1] || '').get('id'));
    try { if (store && id && id !== state.runId) store.remove(id); } catch (_) {}
    res.writeHead(204); res.end(); return;
  }
  if (url === '/detail') {
    const id = new URLSearchParams(req.url.split('?')[1] || '').get('id') || MAIN;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(detailFor(id)));
    return;
  }
  if (url === '/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(state)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url === '/state') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(state)); return; }
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

newRun('free');
setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 20000);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`flow-viewer: port ${PORT} sudah dipakai (mungkin sudah jalan)`); process.exit(0); }
  throw err;
});
server.listen(PORT, '127.0.0.1', () => console.log(`flow-viewer: http://localhost:${PORT}`));
