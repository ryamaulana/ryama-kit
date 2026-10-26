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

const FLOW_CMD = /\/(?:fullstack-dev:)?(build|boilerplate|ui-only|fe-only|prd-check)\b[ \t]*([\w-]*)/;
const norm = (n) => String(n || '').split(':').pop().trim();
const base = (p) => String(p || '').split(/[\\/]/).pop();
const MAIN = '__main';

let state = null;
let fileSets = {};
let lifecycleSeen = false; // true once any SubagentStart/Stop arrives; then PostToolUse(Agent) is not trusted to mean "finished"
let details = {};   // key (agent id or __main) -> { events, files, task, result, agentIds }
let evIndex = {};   // tool_use_id -> { key, rec }
let usageAt = {};   // key -> last usage refresh time
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
  return { name, model: get('model'), tools: get('tools'), skills, description: get('description').slice(0, 220) };
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
  n.model = d.model || 'inherit';
  n.desc = d.description; n.toolsAllowed = d.tools; n.skillsDef = d.skills;
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

function newRun(key) {
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
    log: state ? state.log : [], mainSkills: [],
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
  rec.out = rec.tool === 'Read' ? `${nlines(text)} baris dibaca` : /^(Write|Edit|MultiEdit)$/.test(rec.tool) ? cap(text, 200) : cap(text, 1200);
  if ((rec.tool === 'Agent' || rec.tool === 'Task') && !rec.input.bg) {
    const d = det(norm(rec.input.agent));
    if (!d.result) d.result = cap(text, 6000);
  }
}

// ---------- token usage / actual model from the Claude Code transcript ----------
function parseUsage(text, filter) {
  const byId = new Map();
  let model = '', last = null;
  for (const line of text.split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch (_) { continue; }
    if (o.type !== 'assistant' || !o.message || !o.message.usage) continue;
    if (filter && !filter(o)) continue;
    byId.set(o.message.id || o.uuid, o.message.usage);
    last = o.message.usage;
    if (o.message.model && o.message.model !== '<synthetic>') model = o.message.model;
  }
  const u = { in: 0, out: 0, cr: 0, cc: 0, turns: byId.size, model, ctx: 0 };
  for (const x of byId.values()) {
    u.in += x.input_tokens || 0; u.out += x.output_tokens || 0;
    u.cr += x.cache_read_input_tokens || 0; u.cc += x.cache_creation_input_tokens || 0;
  }
  if (last) u.ctx = (last.input_tokens || 0) + (last.cache_read_input_tokens || 0) + (last.cache_creation_input_tokens || 0);
  return u;
}
const readText = (f) => fs.promises.readFile(f, 'utf8').catch(() => null);

async function agentUsage(ev, agentId) {
  const tp = ev.transcript_path;
  const cands = [];
  if (ev.agent_transcript_path) cands.push(ev.agent_transcript_path);
  if (tp && agentId) {
    const dir = path.dirname(tp), sid = ev.session_id || path.basename(tp, '.jsonl');
    cands.push(path.join(dir, sid, 'subagents', `agent-${agentId}.jsonl`), path.join(dir, `agent-${agentId}.jsonl`));
  }
  for (const f of cands) {
    const t = await readText(f);
    if (t) { const u = parseUsage(t); if (u.turns) return u; }
  }
  if (tp && agentId) { // older layout: sidechain messages live inside the main transcript
    const t = await readText(tp);
    if (t) { const u = parseUsage(t, (o) => o.isSidechain && o.agentId === agentId); if (u.turns) return u; }
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
      const u = parseUsage(t, (o) => !o.isSidechain);
      if (u.turns) { state.main.usage = u; state.main.model = u.model; }
    } else {
      const n = state.nodes[key], d = details[key];
      if (!n || !d || !d.agentIds.length) return;
      const sum = { in: 0, out: 0, cr: 0, cc: 0, turns: 0, model: '', ctx: 0 };
      let any = false;
      for (const id of d.agentIds) {
        const u = await agentUsage(ev, id);
        if (!u) continue;
        any = true;
        sum.in += u.in; sum.out += u.out; sum.cr += u.cr; sum.cc += u.cc; sum.turns += u.turns;
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
  if (ev.cwd && !scannedDirs.has(path.join(ev.cwd, '.claude', 'agents'))) {
    loadAgentDefs(ev.cwd);
    Object.values(state.nodes).forEach((n) => { if (!n.model) applyDef(n); });
  }
  if (agent && ev.agent_id) { const ids = det(agent).agentIds; if (!ids.includes(ev.agent_id)) ids.push(ev.agent_id); }
  switch (e) {
    case 'UserPromptSubmit': {
      const text = String(ev.prompt || '').replace(/\s+/g, ' ').trim();
      const m = FLOW_CMD.exec(text);
      if (m) {
        const k = m[1] === 'build' ? m[2] : m[1];
        if (FLOWS[k]) { state.prompt = text; newRun(k); addLog('flow', `flow: ${k}`); }
      }
      state.prompt = text.slice(0, 160); state.promptAt = Date.now();
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
      if (id && ev.last_assistant_message) det(id).result = cap(ev.last_assistant_message, 6000);
      stop(id);
      refreshUsage(id, ev, true);
      break;
    }
    case 'PreToolUse':
      recordTool(key, ev);
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
      // For a background agent this fires immediately at launch, so it must NOT mean "finished".
      if ((tool === 'Agent' || tool === 'Task') && !input.run_in_background && !lifecycleSeen) {
        stop(norm(input.subagent_type));
      }
      break;
    case 'Stop':
      state.main.status = 'idle'; addLog('stop', 'sesi utama selesai giliran'); maybeFinalize();
      refreshUsage(MAIN, ev, true);
      break;
    case 'SessionStart': addLog('session', 'sesi dimulai'); refreshUsage(MAIN, ev, true); break;
    default: return false;
  }
  return true;
}

function broadcast() {
  state.updatedAt = Date.now();
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const c of clients) c.write(data);
}

function detailFor(id) {
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
    node: n ? { role: n.role, desc: n.desc, model: n.model, toolsAllowed: n.toolsAllowed, skillsDef: n.skillsDef, skills: n.skills, usage: n.usage, status: n.status, count: n.count, ms: n.status === 'running' ? n.ms + (Date.now() - n.startedAt) : n.ms, background: n.background, extra: n.extra } : { role: 'sesi utama (orchestrator)', model: state.main.model, usage: state.main.usage, skills: state.mainSkills, status: state.main.status },
    task: d.task, taskDesc: d.taskDesc, result: d.result,
    events: d.events, files: Object.values(d.files),
    usageNote: (n ? n.usage : state.main.usage) ? '' : 'Token belum terbaca. Hook belum mengirim transcript_path, atau file transcript agent ini belum ditemukan (cek ~/.claude/flow-viewer/events.jsonl).',
  };
}

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
    newRun(state.flow); broadcast(); res.writeHead(204); res.end(); return;
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
  if (url === '/health') { res.writeHead(200); res.end('ok'); return; }
  if (req.method === 'GET') {
    const file = url === '/' ? 'index.html' : path.normalize(url).replace(/^([/\\]|\.\.)+/g, '');
    const full = path.join(PUBLIC, file);
    if (full.startsWith(PUBLIC) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
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
