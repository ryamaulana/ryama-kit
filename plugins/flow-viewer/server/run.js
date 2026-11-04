'use strict';
// Satu Run = satu pabrik createRun(). Seluruh mesin status 1.7.1 (handle, start/stop, detail, convo, laporan)
// hidup di sini; tidak ada variabel modul. Jam, katalog agent, dan pembaca token diinjeksi.
const path = require('path');
const { attention } = require('./attention');

const FLOW_CMD = /\/(?:fullstack-dev:)?(build|start|run|backlog|boilerplate|ui-only|fe-only|prd-check|ui-direction)\b[ \t]*([\w-]*)/;
const MAIN = '__main';
const norm = (n) => String(n || '').split(':').pop().trim();
const base = (p) => String(p || '').split(/[\\/]/).pop();
const eqOf = (u) => u ? Math.round((u.in || 0) + (u.cc || 0) * 1.25 + (u.cr || 0) * 0.1 + (u.out || 0) * 5) : 0;
const rawOf = (u) => u ? (u.in || 0) + (u.out || 0) + (u.cr || 0) + (u.cc || 0) : 0;
const cap = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + `\n… (+${s.length - n} karakter lagi)` : s; };
const nlines = (s) => (s ? String(s).replace(/\n$/, '').split('\n').length : 0);
const QUIET_MS = 10 * 60 * 1000; // 5.3: Agent diam (konstanta server, A13)
const BOROS = 1.5;               // 5.3: eq > 150% pembanding
// 5.1 (T12): Stop berisi permintaan jawaban dari pemilik? Buang catatan kaki "Subagent/Agent yang dipanggil: ..." lebih dulu
// (kebiasaan pemilik, menyembunyikan tanda tanya di ujung), lalu cari tanda tanya pada 3 kalimat terakhir atau frasa menunggu.
const FOOTER = /\s*\**(?:Sub)?[Aa]gents?(?: yang)?(?: sudah| sejauh ini)?(?: dipanggil| dipakai| invoked)[^.]*(?:\.|$)/;
const WAITING = /(?:setelah (?:jawaban|(?:kamu|anda|lu|lo) (?:menjawab|setuju|approve))|(?:menunggu|tunggu) (?:jawaban|persetujuan|keputusan|approve)|jawab di tombol|\bkabari\b|belum approve|balas dengan)/i;
function asksOwner(text) {
  const t = String(text || '').replace(FOOTER, '').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  const tail = t.split(/(?<=[.!?])\s+/).slice(-3).join(' ');
  return /\?(?=\s|$|[)\]*_`"'])/.test(tail) || WAITING.test(t.slice(-400));
}
const aliasOf = (m) => /opus/i.test(m) ? 'opus' : /sonnet/i.test(m) ? 'sonnet' : /haiku/i.test(m) ? 'haiku' : '';

// Flow yang diminta prompt ini ('' bila bukan perintah flow). Pemanggil membuat run baru lebih dulu.
function flowCommand(ev, flows) {
  if ((ev.hook_event_name || ev.event) !== 'UserPromptSubmit') return '';
  const text = String(ev.prompt || '').replace(/\s+/g, ' ').trim();
  if (/^<(agent-message|task-notification|system-reminder)\b/i.test(text)) return '';
  const m = FLOW_CMD.exec(text);
  if (!m) return '';
  const k = m[1] === 'build' ? m[2] : m[1];
  return flows[k] ? k : '';
}

// Adaptor katalog dari flows.json + peta definisi agent: {defs, crew, crewMeta, edges, flow(name), refresh(cwd)}.
function catalogFromFlows(flows, defs, refresh) {
  const ov = flows.free;
  return { defs, crew: ov.nodes.map((n) => n.id), crewMeta: ov.nodes.map((n) => ({ id: n.id, col: n.col, row: n.row })), edges: ov.edges, flow: (name) => flows[name] || null, refresh: refresh || (() => false) };
}

function createRun({ key = '', flow = 'free', catalog, usage = null, now = Date.now, prev = null, fresh = false, onChange = () => {}, backlog = () => null, compare = null, project = null } = {}) {
  const defs = catalog.defs;
  const k = catalog.flow(flow) ? flow : 'free';
  const f = catalog.flow(k);
  const ov = catalog.flow('free'); // overview = seluruh kru, selalu tampil agar graf tidak kosong
  const t0 = now();
  const id = Math.max(t0, prev ? prev.id + 1 : 0);

  let details = {};   // key (id agent atau __main) -> { events, files, task, result, agentIds }
  let evIndex = {};   // tool_use_id -> { key, rec }
  const usageAt = {}; // key -> kapan token terakhir dibaca
  const fileSets = {};
  let lifecycleSeen = prev ? prev.lifecycleSeen : false; // setelah ada SubagentStart/Stop, PostToolUse(Agent) tidak dipercaya sebagai "selesai"
  let convo = !fresh && prev ? prev.convo.slice() : [];
  let pend = []; // pending; yang pertama juga jadi `pending` legacy di snapshot
  const unit = !!prev && !fresh;
  const SETTLE_MS = 2000; // 5.1: klasifikasi akhir setelah 2 dtk tanpa event (hook bisa tiba tak berurutan)
  let session = '';       // sesi pemilik run ini
  let stopSeen = false;   // Stop sesi utama sudah terjadi dan belum ada kerja baru
  let bgRunning = false;  // Stop terakhir membawa background_tasks yang masih jalan
  let lastEventAt = t0;
  let lastClaude = '';
  let paused = false;
  let finishedAt = 0;     // kapan fase menjadi finished (untuk `at` item Selesai)
  let stopN = 0, seqQ = 0, seqPerm = 0; // nomor urut Stop / pertanyaan / izin di run ini (kunci 5.3)
  const droppedCmp = new Set(), cmpMemo = new Map();

  function applyDef(n) {
    const d = defs[n.id];
    if (!d) return;
    n.model = d.model || 'inherit'; n.effort = d.effort || '';
    n.desc = d.description; n.toolsAllowed = d.tools; n.skillsDef = d.skills;
  }
  function mkNode(nid, def = {}, extra = false) {
    const n = {
      id: nid, role: def.role || '', optional: !!def.optional, extra,
      status: 'idle', lastEventAt: 0, quiet: false, count: 0, tools: 0, files: 0, skills: [], last: '', recent: [],
      background: false, offscope: false, segments: [], startedAt: null, endedAt: null, ms: 0,
      model: '', desc: '', toolsAllowed: '', skillsDef: [], usage: null,
    };
    applyDef(n);
    return n;
  }

  const nodes = {};
  ov.nodes.forEach((n) => { nodes[n.id] = mkNode(n.id, n); });
  if (k !== 'free') {
    Object.values(nodes).forEach((n) => { n.offscope = true; n.optional = false; });
    f.nodes.forEach((n) => { nodes[n.id] = mkNode(n.id, n); });
  }
  const S = {
    flow: k, title: f.title, runId: id, startedAt: t0, finished: false,
    expected: k === 'free' ? [] : f.nodes.map((n) => n.id), edges: f.edges, nodes,
    crew: catalog.crew, crewMeta: catalog.crewMeta, crewEdges: catalog.edges,
    prompt: unit ? prev.state.prompt : '', promptAt: unit ? prev.state.promptAt : null,
    main: { status: 'idle', tools: 0, last: '', recent: [], usage: null, model: '' },
    summary: null, log: prev ? prev.state.log : [], mainSkills: [], skillCalls: [], mainSegs: [],
  };

  function modelCheck(n) {
    const actual = (n.usage && n.usage.model) || n.resolvedModel;
    n.modelSrc = n.usage && n.usage.model ? 'transcript' : n.resolvedModel ? 'peluncuran' : '';
    if (!actual || !n.model) return 'unverified';
    if (n.model === 'inherit') { const mm = S.main.model; return mm ? (mm === actual ? 'ok' : 'mismatch') : 'unverified'; }
    if (n.model === actual) return 'ok';
    return aliasOf(actual) && aliasOf(actual) === aliasOf(n.model) ? 'ok' : 'mismatch';
  }

  function addLog(kind, text) {
    S.log.unshift({ t: now(), kind, text });
    if (S.log.length > 200) S.log.length = 200;
  }
  function getNode(nid) {
    if (!S.nodes[nid]) S.nodes[nid] = mkNode(nid, {}, true);
    return S.nodes[nid];
  }
  function openSegment(n, t) { n.segments.push({ s: t, e: null }); }
  function closeSegment(n, t) {
    const seg = n.segments[n.segments.length - 1];
    if (seg && seg.e === null) seg.e = t;
  }

  function start(nid, opts = {}) {
    if (!nid) return;
    const n = getNode(nid);
    if (opts.background) n.background = true;
    if (n.status === 'running') return; // dedupe SubagentStart + PreToolUse(Agent)
    const t = now();
    n.status = 'running'; n.lastEventAt = t; n.count += 1; n.startedAt = t; n.last = 'mulai'; n.failReason = '';
    openSegment(n, t);
    resume();
    addLog('start', `${nid} mulai${n.background ? ' (background)' : ''}${n.count > 1 ? ` (putaran ${n.count})` : ''}`);
  }
  function stop(nid) {
    if (!nid) return;
    const n = getNode(nid);
    if (n.status !== 'running') return;
    const t = now();
    n.status = 'done'; n.endedAt = t; n.ms += t - n.startedAt;
    closeSegment(n, t);
    addLog('done', `${nid} selesai`);
  }
  // 5.2: Agent/Task dengan is_error|error|interrupted -> node failed + alasan 1 baris; hilang saat agent mulai lagi.
  function failNode(nid, reason) {
    if (!nid) return;
    const n = getNode(nid);
    if (n.status === 'running') { const t = now(); n.endedAt = t; n.ms += t - n.startedAt; closeSegment(n, t); }
    n.status = 'failed'; n.lastEventAt = now(); n.failReason = cap(String(reason || 'agent gagal').replace(/\s+/g, ' ').trim(), 160);
    addLog('fail', `${nid} gagal: ${n.failReason}`);
  }
  // Agent yang mengirim event tool itu hidup, apa pun dugaan sebelumnya (self-heal).
  function ensureRunning(nid) {
    const n = getNode(nid);
    if (n.status === 'running') return n;
    n.status = 'running'; n.startedAt = now(); if (n.count === 0) n.count = 1;
    openSegment(n, n.startedAt);
    resume();
    return n;
  }
  function pushRecent(list, text) {
    list.unshift({ t: now(), text });
    if (list.length > 4) list.length = 4;
  }
  function skill(name, agent) {
    if (!name) return;
    if (agent) {
      const n = getNode(agent);
      if (!n.skills.includes(name)) n.skills.push(name);
    } else if (!S.mainSkills.includes(name)) S.mainSkills.push(name);
    S.skillCalls.unshift({ t: now(), name: String(name).replace(/^.*:/, ''), agent: agent || '' });
    if (S.skillCalls.length > 40) S.skillCalls.length = 40;
    addLog('skill', `skill ${name}${agent ? ` (oleh ${agent})` : ' (sesi utama)'}`);
  }
  function describe(tool, input) {
    const fl = base(input.file_path || input.path || input.notebook_path);
    if (fl) return `${tool} ${fl}`;
    if (input.command) return `${tool} ${String(input.command).slice(0, 48)}`;
    if (input.pattern) return `${tool} ${String(input.pattern).slice(0, 48)}`;
    if (input.url) return `${tool} ${String(input.url).slice(0, 48)}`;
    return tool;
  }
  function activity(agent, tool, input) {
    const text = describe(tool, input);
    if (!agent) {
      S.main.tools += 1; S.main.last = text; pushRecent(S.main.recent, text);
      return;
    }
    const n = ensureRunning(agent);
    n.tools += 1; n.last = text; pushRecent(n.recent, text);
    const fp = input.file_path || input.notebook_path;
    if (fp && /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(tool)) {
      (fileSets[agent] = fileSets[agent] || new Set()).add(fp);
      n.files = fileSets[agent].size;
    }
  }

  // ---------- detail per node ----------
  function det(dk) {
    return details[dk] || (details[dk] = { events: [], files: {}, task: '', taskDesc: '', result: '', agentIds: [] });
  }
  function say(kind, text, extra) {
    const t = String(text == null ? '' : text).trim();
    if (!t && !(extra && extra.questions)) return;
    convo.push(Object.assign({ t: now(), kind, text: cap(t, kind === 'claude' ? 6000 : 3000) }, extra || {}));
    if (convo.length > 150) convo.shift();
  }
  // Pending = daftar per pengirim (`session:agent_id|main`); hilang saat event non-Notification berikutnya dari pengirim itu.
  const senderOf = (ev) => `${ev.session_id || ''}:${ev.agent_id || 'main'}`;
  let curSender = senderOf({});
  // Kunci 5.3: q:<pengirim>:<tool_use_id|runId.n>, perm:..., idle_prompt = q:<pengirim>:<runId>.w<Stop ke-n>.
  // `soft` (dari Notification): pengirim yang sudah punya pending tidak membuat item kedua.
  const setPending = (kind, text, options, tuid, soft) => {
    const had = pend.find((p) => p.sender === curSender);
    if (soft && had && (kind === 'waiting' || had.kind === kind)) return;
    pend = pend.filter((p) => p.sender !== curSender);
    const pre = kind === 'permission' ? 'perm' : 'q';
    const ev = tuid || (kind === 'waiting' ? `${id}.w${stopN}` : `${id}.${kind === 'permission' ? ++seqPerm : ++seqQ}`);
    pend.push({ key: `${pre}:${curSender}:${ev}`, kind, sender: curSender, text: cap(text, 500), options: options || [], at: now() });
  };
  const clearPending = (sender) => { pend = sender ? pend.filter((p) => p.sender !== sender) : []; };

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
  function recordTool(rk, ev) {
    const d = det(rk);
    const input = ev.tool_input || {};
    const rec = {
      id: ev.tool_use_id || `${now()}-${Math.random().toString(36).slice(2, 7)}`,
      t: now(), tool: ev.tool_name, summary: describe(ev.tool_name, input),
      input: sanitize(ev.tool_name, input), status: 'pending', ms: null, out: '',
    };
    d.events.push(rec);
    if (d.events.length > 400) delete evIndex[d.events.shift().id];
    evIndex[rec.id] = { key: rk, rec };
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
    rec.ms = now() - rec.t;
    const text = respText(r);
    if (rec.status === 'error' && (rec.tool === 'Agent' || rec.tool === 'Task')) failNode(norm(rec.input.agent), (r && (r.error || r.message)) || respText(r));
    if (rec.status === 'error') say('error', `${rec.tool}: ${cap(respText(r), 500)}`, { agent: hit.key === MAIN ? '' : hit.key });
    rec.out = rec.tool === 'Read' ? `${nlines(text)} baris dibaca` : /^(Write|Edit|MultiEdit)$/.test(rec.tool) ? cap(text, 200) : cap(text, 1200);
    if (rec.tool === 'Agent' || rec.tool === 'Task') {
      let obj = r && typeof r === 'object' ? r : null;
      if (!obj) { try { obj = JSON.parse(text); } catch (_) { obj = null; } }
      const aid = norm(rec.input.agent);
      if (obj && obj.resolvedModel && S.nodes[aid]) S.nodes[aid].resolvedModel = String(obj.resolvedModel);
      const launch = obj && (obj.isAsync || obj.status === 'async_launched');
      if (!launch && !rec.input.bg) { const d = det(aid); if (!d.result) d.result = cap(text, 6000); }
      if (launch) rec.out = 'agent diluncurkan di latar belakang' + (obj.resolvedModel ? ` (model ${obj.resolvedModel})` : '');
    }
  }

  const mainOpen = () => { const g = S.mainSegs[S.mainSegs.length - 1]; if (!g || g.e) { S.mainSegs.push({ s: now(), e: null }); if (S.mainSegs.length > 500) S.mainSegs.shift(); } };
  const mainClose = () => { const g = S.mainSegs[S.mainSegs.length - 1]; if (g && !g.e) g.e = now(); };

  // Kerja baru (prompt, pesan sistem, agent mulai, tool sesi utama) membatalkan kandidat akhir dan Jeda.
  function resume() { S.finished = false; S.outcome = ''; S.summary = null; paused = false; stopSeen = false; }
  const anyNodeRunning = () => Object.values(S.nodes).some((n) => n.status === 'running');

  // Kandidat akhir -> diklasifikasikan (5.1) setelah SETTLE_MS tanpa event. Murni fungsi jam; true bila fase berubah.
  function settle() {
    if (S.finished || paused || !stopSeen || S.main.status === 'running' || bgRunning || anyNodeRunning()) return false;
    if (now() - lastEventAt < SETTLE_MS) return false;
    const ns = Object.values(S.nodes);
    if (ns.some((n) => n.status === 'failed') || backlogFailed().length) { S.finished = true; finishedAt = now(); S.outcome = 'failed'; S.summary = buildSummary(); return true; }
    // 5.1 (T12): flow dengan "batch": true (flows.json) berputar per batch; tiap batch sah berhenti tanpa semua langkahnya, jadi langkah wajib tidak menjeda.
    const missing = !(f && f.batch) && S.expected.some((i) => { const n = S.nodes[i]; return n && !n.optional && n.count === 0; });
    if (missing || asksOwner(lastClaude)) { paused = true; return true; }
    let skipped = false;
    for (const n of ns) {
      if (S.expected.length && n.status === 'idle' && !n.extra && !n.offscope) { n.status = n.optional ? 'optional' : 'skipped'; if (!n.optional) skipped = true; }
    }
    S.finished = true; finishedAt = now(); S.outcome = skipped ? 'skipped' : 'ok'; S.summary = buildSummary();
    return true;
  }

  const backlogFailed = () => { const b = backlog(); return b && Array.isArray(b.items) ? b.items.filter((i) => i.status === 'failed') : []; };
  // 5.5: pembanding dicari saat dibutuhkan (flow free: tergantung ada-tidaknya agent) dan dipakai ulang; `compare` boleh objek, atau fungsi({flow, beforeId, withAgents}) -> baris riwayat.
  const asCmp = (x) => (x ? { id: x.id || 0, eq: x.eq ?? x.tokens_eq ?? 0, durMs: x.durMs ?? Math.max(0, (x.updated_at || 0) - (x.started_at || 0)) } : null);
  function cmp() {
    let c = compare;
    if (typeof compare === 'function') {
      const wa = Object.values(S.nodes).some((n) => n.count > 0);
      if (!cmpMemo.has(wa)) { let r = null; try { r = compare({ flow: k, beforeId: id, withAgents: wa }); } catch (_) { /* tanpa pembanding */ } cmpMemo.set(wa, asCmp(r)); }
      c = cmpMemo.get(wa);
    } else c = asCmp(c);
    return c && !droppedCmp.has(c.id) ? c : null;
  }
  function tokens() {
    const eq = totalEq(), c = cmp(), pe = c && c.eq > 0 ? c.eq : null;
    return { eq, prevEq: pe, deltaPct: pe && eq != null ? Math.round((eq - pe) / pe * 100) : null, boros: pe != null && eq != null && eq > BOROS * pe };
  }
  // 5.4: backlog berbobot > langkah wajib > kosong.
  function progress() {
    const b = backlog();
    if (b && typeof b.pct === 'number') return { pct: b.pct, label: `Backlog ${b.done} dari ${b.total} item` };
    const req = S.expected.map((i) => S.nodes[i]).filter((n) => n && !n.optional);
    if (!req.length) return { pct: null, label: '' };
    const ran = req.filter((n) => n.count > 0).length;
    return { pct: Math.round(ran / req.length * 100), label: `Langkah wajib ${ran} dari ${req.length}` };
  }
  const projectOf = () => {
    const parts = String(key).split(/[\\/]+/).filter(Boolean);
    return { id: '', name: base(key) || key, shortPath: parts.slice(-2).join('/') || key, path: key, ...(typeof project === 'function' ? project() : project) };
  };
  const totalEq = () => { const us = Object.values(S.nodes).map((n) => n.usage).concat(S.main.usage); return us.some(Boolean) ? us.reduce((a, u) => a + eqOf(u), 0) : null; };
  // 5.6: dibuat sekali saat finished; ikut tersimpan lewat state.
  function buildSummary() {
    const ns = Object.values(S.nodes);
    const ranIds = ns.filter((n) => n.count > 0).map((n) => n.id);
    const ids = S.expected.length ? S.expected : ranIds;
    const rank = { failed: 0, skipped: 1 };
    const steps = ids.map((i) => S.nodes[i]).filter(Boolean).map((n) => ({ id: n.id, status: n.status, reason: n.status === 'failed' ? n.failReason || '' : '' }));
    backlogFailed().forEach((i) => steps.push({ id: i.id, status: 'failed', reason: i.lastFailure || '', source: 'backlog' }));
    steps.sort((a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2));
    const files = [];
    Object.entries(details).forEach(([dk, d]) => Object.values(d.files || {}).forEach((x) => files.push({ agent: dk === MAIN ? '' : dk, path: x.path, add: x.add, del: x.del, created: !!x.created })));
    const eq = totalEq(), durMs = Math.max(0, lastEventAt - S.startedAt);
    const { prevEq: pe, deltaPct } = tokens(), c = cmp();
    const b = backlog();
    const decisions = ((b && b.decisions) || []).map((d) => ({ kind: 'decision', id: d.id, title: d.title, text: d.question }))
      .concat(pend.filter((p) => p.kind === 'question').map((p) => ({ kind: 'question', text: p.text })));
    const failedNode = ns.find((n) => n.status === 'failed');
    return {
      auto: ranIds.length > 0 || files.length > 0, result: S.outcome,
      failedAgent: failedNode ? failedNode.id : '', steps,
      tokens: { eq, prevEq: pe, deltaPct },
      durMs, prev: c ? { eq: c.eq || 0, durMs: c.durMs || 0, durDeltaPct: c.durMs > 0 ? Math.round((durMs - c.durMs) / c.durMs * 100) : null } : null,
      files, decisions,
    };
  }

  const run = {};
  function refresh(rk, ev, force) { if (usage) usage.refresh(run, rk, ev, force); }

  // Mengembalikan true bila event dikenali (pemanggil lalu menyiarkan snapshot).
  function apply(ev) {
    const e = ev.hook_event_name || ev.event;
    const tool = ev.tool_name;
    const input = ev.tool_input || {};
    const agent = norm(ev.agent_type);
    const rk = agent || MAIN;
    curSender = senderOf(ev);
    lastEventAt = now();
    if (agent && S.nodes[agent]) S.nodes[agent].lastEventAt = lastEventAt;
    if (!session && ev.session_id) session = ev.session_id;
    if (!ev.agent_id && (e === 'PreToolUse' || e === 'PostToolUse') && S.main.status === 'idle') { S.main.status = 'running'; resume(); mainOpen(); }
    if (e !== 'Notification' && e !== 'PermissionRequest' && !(e === 'PreToolUse' && tool === 'AskUserQuestion')) clearPending(curSender);
    if (ev.cwd && catalog.refresh(ev.cwd)) Object.values(S.nodes).forEach((n) => { if (!n.model) applyDef(n); });
    if (agent && ev.agent_id) { const ids = det(agent).agentIds; if (!ids.includes(ev.agent_id)) ids.push(ev.agent_id); }
    switch (e) {
      case 'UserPromptSubmit': {
        const text = String(ev.prompt || '').replace(/\s+/g, ' ').trim();
        if (/^<(agent-message|task-notification|system-reminder)\b/i.test(text)) { // sistem menyuntik pesan (mis. agent latar selesai), bukan ketikan user
          say('notify', 'notifikasi sistem: ' + cap(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 200));
          addLog('stop', 'notifikasi agent masuk');
          S.main.status = 'running'; resume(); mainOpen();
          break;
        }
        const fk = flowCommand(ev, { [k]: 1 }); // run ini dibuat untuk flow itu oleh pemanggil
        if (fk) addLog('flow', `flow: ${fk}`);
        S.prompt = text.slice(0, 160); S.promptAt = now();
        say('user', String(ev.prompt || ''));
        clearPending();
        S.main.status = 'running'; resume(); mainOpen();
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
        const aid = norm(ev.agent_type);
        if (aid && ev.agent_id) { const ids = det(aid).agentIds; if (!ids.includes(ev.agent_id)) ids.push(ev.agent_id); }
        if (aid && ev.last_assistant_message) { det(aid).result = cap(ev.last_assistant_message, 6000); say('agent', ev.last_assistant_message, { agent: aid }); }
        stop(aid);
        refresh(aid, ev, true);
        break;
      }
      case 'PreToolUse':
        recordTool(rk, ev);
        if (tool === 'AskUserQuestion') {
          const qs = (input.questions || []).slice(0, 4).map((q) => ({ question: cap(q.question, 400), header: q.header, multi: !!q.multiSelect, options: (q.options || []).slice(0, 6).map((o) => ({ label: cap(o.label, 120), description: cap(o.description, 200) })) }));
          say('question', qs.map((q) => q.question).join('\n'), { agent: agent || '', questions: qs });
          setPending('question', qs.length ? qs[0].question : 'Claude bertanya', qs.length ? qs[0].options.map((o) => o.label) : [], ev.tool_use_id);
        }
        if (tool === 'Agent' || tool === 'Task') {
          const aid = norm(input.subagent_type);
          start(aid, { background: !!input.run_in_background });
          if (aid) { const d = det(aid); d.task = cap(input.prompt, 4000); d.taskDesc = cap(input.description, 200); }
          activity(agent, tool, input);
        } else if (tool === 'Skill') { skill(input.skill || input.name || input.command, agent); activity(agent, tool, input); }
        else activity(agent, tool, input);
        refresh(rk, ev, false);
        break;
      case 'PostToolUse':
        recordPost(ev);
        if (tool === 'AskUserQuestion') say('answer', respText(ev.tool_response), { agent: agent || '' });
        // Untuk agent latar ini terpicu saat peluncuran, jadi TIDAK berarti selesai.
        if ((tool === 'Agent' || tool === 'Task') && !input.run_in_background && !lifecycleSeen) stop(norm(input.subagent_type));
        break;
      case 'Stop':
        S.main.status = 'idle'; mainClose(); addLog('stop', 'sesi utama selesai giliran');
        stopSeen = true; stopN += 1; lastClaude = String(ev.last_assistant_message || '');
        // 5.1 (T12): tugas shell tidak dihitung; daftar Claude Code memuat shell basi (ls, sed, rm) dan server dev yang tak berakhir. Hanya agent latar.
        bgRunning = (Array.isArray(ev.background_tasks) ? ev.background_tasks : []).some((x) => x && x.type !== 'shell' && (x.status || 'running') === 'running');
        // 5.1 (T12): daftar background_tasks di Stop adalah sumber paling benar; node berstatus running yang agent-id-nya tidak
        // ada di daftar itu basi (SubagentStop hilang) dan tidak boleh menahan Selesai/Jeda.
        if (Array.isArray(ev.background_tasks)) {
          const live = new Set(ev.background_tasks.filter((x) => x && x.type !== 'shell' && (x.status || 'running') === 'running').map((x) => x.id));
          Object.values(S.nodes).forEach((n) => { if (n.status === 'running') { const ids = det(n.id).agentIds; if (ids.length && !ids.some((i) => live.has(i))) stop(n.id); } });
        }
        if (ev.last_assistant_message) say('claude', ev.last_assistant_message);
        refresh(MAIN, ev, true);
        break;
      case 'PermissionRequest': {
        const txt = `${tool || 'tool'}: ${describe(tool || '', input).replace(/^\w+ ?/, '')}`;
        say('permission', txt, { agent: agent || '' });
        setPending('permission', `Izin dibutuhkan: ${txt}`, [], ev.tool_use_id);
        addLog('perm', `menunggu izin: ${txt.slice(0, 60)}`);
        break;
      }
      case 'Notification': {
        const msg = String(ev.message || ''), nt = String(ev.notification_type || '');
        say('notify', msg);
        if (phase() === 'finished') break; // 5.3: Notification saat finished bukan pemicu (Selesai tidak berbunyi dua kali)
        if (/permission/i.test(nt + msg)) setPending('permission', msg, [], '', true);
        else if (/idle|waiting/i.test(nt + msg)) setPending('waiting', msg, [], '', true);
        break;
      }
      case 'SessionStart': addLog('session', 'sesi dimulai'); refresh(MAIN, ev, true); break;
      default: return false;
    }
    return true;
  }

  // Event dari sesi lama: hanya pertanyaan dan izin yang diproses agar tidak terlewat.
  function applyForeign(ev) {
    const e = ev.hook_event_name || ev.event;
    const isQ = e === 'PreToolUse' && ev.tool_name === 'AskUserQuestion';
    if (!isQ && e !== 'PermissionRequest' && e !== 'Notification') return false;
    return apply(ev);
  }

  function snapDetails() {
    const out = {};
    for (const [dk, d] of Object.entries(details)) {
      out[dk] = {
        task: d.task, taskDesc: d.taskDesc, result: d.result,
        events: (d.events || []).slice(-200).map((r) => ({ id: r.id, t: r.t, tool: r.tool, summary: r.summary, status: r.status, ms: r.ms })),
        files: Object.values(d.files || {}).map((fl) => ({ path: fl.path, add: fl.add, del: fl.del, edits: fl.edits, created: fl.created })),
      };
    }
    return out;
  }

  function phase() {
    settle();
    if (S.finished) return 'finished';
    if (paused) return 'paused';
    return S.main.status === 'running' || bgRunning || anyNodeRunning() || stopSeen ? 'running' : 'idle';
  }
  // Dipanggil berkala oleh server; true bila fase berubah akibat jam saja.
  function tick() { return settle(); }
  // Event ini harus memulai run baru? (prompt pemilik setelah selesai; sesi lain mulai/prompt)
  function rollover(ev) {
    const e = ev.hook_event_name || ev.event;
    const text = String(ev.prompt || '').trim();
    const sys = /^<(agent-message|task-notification|system-reminder)\b/i.test(text);
    if (ev.session_id && session && ev.session_id !== session && (e === 'SessionStart' || (e === 'UserPromptSubmit' && !sys))) return true;
    return e === 'UserPromptSubmit' && !sys && phase() === 'finished';
  }

  // Superset 1.7.1; `pending` tetap satu objek (yang pertama) untuk klien lama.
  function snapshot() {
    S.backlog = backlog();
    S.updatedAt = now();
    S.pending = pend[0] || null; S.pendings = pend.slice(); S.convoN = convo.length; S.phase = phase();
    const fl = [];
    Object.entries(details).forEach(([dk, d]) => Object.values(d.files || {}).forEach((x) => fl.push({ agent: dk, path: x.path, add: x.add, del: x.del, created: !!x.created })));
    S.fileList = fl.slice(-40);
    Object.values(S.nodes).forEach((n) => {
      const d = details[n.id]; n.modelCheck = modelCheck(n); n.snippet = d && d.result ? cap(d.result.replace(/\s+/g, ' '), 240) : '';
      n.quiet = n.status === 'running' && now() - (n.lastEventAt || n.startedAt || 0) > QUIET_MS;
    });
    // Salinan dangkal: field baru tidak ikut tersimpan ke Riwayat (live:true tidak boleh terbawa).
    return {
      ...S, project: projectOf(), live: true, progress: progress(), tokens: tokens(),
      attention: attention({ runId: id, phase: S.phase, session, finishedAt, pendings: pend, nodes: S.nodes, backlog: S.backlog && S.backlog.items }),
    };
  }

  // Baris untuk store.save, atau null bila run masih kosong.
  function row(project = key) {
    const ns = Object.values(S.nodes);
    const ran = ns.filter((n) => n.count > 0).length;
    if (!S.promptAt && !convo.length && !ran) return null;
    const eq = ns.reduce((a, n) => a + eqOf(n.usage), 0) + eqOf(S.main.usage);
    const raw = ns.reduce((a, n) => a + rawOf(n.usage), 0) + rawOf(S.main.usage);
    return {
      id: S.runId, project: project || '', flow: S.flow, title: S.title || '', prompt: String(S.prompt || '').slice(0, 600),
      started_at: S.startedAt, updated_at: now(), finished: S.finished ? 1 : 0, tokens_eq: eq, tokens_raw: raw, agents_ran: ran,
      files: (S.fileList || []).length, state: JSON.stringify({ ...S, details: snapDetails() }), convo: JSON.stringify(convo.filter((m) => m.t >= S.startedAt - 1000).slice(-300)),
    };
  }

  function detail(did) {
    if (did === '__convo') return { id: did, title: 'Percakapan', convo, pending: pend[0] || null, pendings: pend.slice() };
    if (did === '__all') {
      const files = [], events = [];
      for (const [dk, d] of Object.entries(details)) {
        Object.values(d.files).forEach((x) => files.push({ ...x, agent: dk === MAIN ? 'Claude' : dk }));
        d.events.forEach((r) => { if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(r.tool)) events.push({ ...r, agent: dk === MAIN ? 'Claude' : dk }); });
      }
      events.sort((a, b) => a.t - b.t);
      return { id: did, title: 'Semua file yang diubah', files, events };
    }
    const d = det(did);
    const n = did === MAIN ? null : S.nodes[did];
    return {
      id: did, title: did === MAIN ? 'Claude (sesi utama)' : did,
      mainModel: S.main.model || '', node: n ? { role: n.role, desc: n.desc, model: n.model, effort: n.effort, modelCheck: n.modelCheck, modelSrc: n.modelSrc, resolvedModel: n.resolvedModel, toolsAllowed: n.toolsAllowed, skillsDef: n.skillsDef, skills: n.skills, usage: n.usage, invocations: n.invocations, status: n.status, count: n.count, ms: n.status === 'running' ? n.ms + (now() - n.startedAt) : n.ms, background: n.background, extra: n.extra } : { role: 'sesi utama (orchestrator)', model: S.main.model, usage: S.main.usage, skills: S.mainSkills, status: S.main.status },
      task: d.task, taskDesc: d.taskDesc, result: d.result,
      events: d.events, files: Object.values(d.files),
      usageNote: (n ? n.usage : S.main.usage) ? '' : 'Token belum terbaca. Hook belum mengirim transcript_path, atau file transcript agent ini belum ditemukan (cek ~/.claude/flow-viewer/events.jsonl).',
    };
  }

  function report() {
    const hm = (t) => new Date(t).toLocaleTimeString('id-ID', { hour12: false });
    const ns = Object.values(S.nodes);
    const running = ns.filter((n) => n.status === 'running');
    const pending = pend[0] || null;
    const L = [];
    L.push(`# Laporan Flow Viewer (diperbarui ${hm(now())})`);
    let st;
    if (paused) st = `JEDA: ${cap(lastClaude.replace(/\s+/g, ' '), 160) || 'menunggu input'}`;
    else if (pending) st = `MENUNGGU KAMU (${pending.kind}): ${pending.text}`;
    else if (running.length) st = `BEKERJA: agent berjalan: ${running.map((n) => n.id).join(', ')}`;
    else if (S.main.status === 'running') st = 'BEKERJA: sesi utama';
    else st = 'IDLE: giliran selesai, menunggu prompt berikutnya';
    L.push(`STATUS: ${st}`);
    const exp = S.expected.map((i) => S.nodes[i]).filter((n) => n && !n.optional);
    if (S.expected.length) {
      const ran = exp.filter((n) => n.count > 0), miss = exp.filter((n) => n.count === 0);
      L.push(`FLOW: ${S.flow} | langkah wajib jalan ${ran.length}/${exp.length}${S.finished && miss.length ? ' | DILEWATI: ' + miss.map((n) => n.id).join(', ') : ''}`);
    } else L.push('FLOW: overview (belum ada command flow)');
    L.push(`PROMPT TERAKHIR: ${S.prompt || '-'}`);
    if (pending && pending.kind === 'question') {
      const q = [...convo].reverse().find((c) => c.kind === 'question');
      if (q && q.questions) {
        L.push('', '## Pertanyaan yang menunggu jawaban');
        q.questions.forEach((x, i) => { L.push(`${i + 1}. ${x.question}${x.multi ? ' (boleh pilih lebih dari satu)' : ''}`); x.options.forEach((o) => L.push(`   - ${o.label}${o.description ? ': ' + o.description : ''}`)); });
      }
    }
    L.push('', '## Agent');
    L.push('nama | status | model dideklarasi | model terbaca di transcript | cek | effort | token | tool | file | aktivitas terakhir');
    ns.filter((n) => n.count > 0 || n.status !== 'idle' || n.extra).forEach((n) => {
      const u = n.usage; const tok = u ? u.in + u.out + u.cr + u.cc : 0;
      L.push(`${n.id} | ${n.status}${n.background ? ' (BG)' : ''} | ${n.model || '-'} | ${(u && u.model) || 'belum terbaca'} | ${n.modelCheck || modelCheck(n)} | ${n.effort || 'tidak diatur'} | ${tok || '-'} | ${n.tools} | ${n.files} | ${n.last || '-'}`);
    });
    if (!ns.some((n) => n.count > 0)) L.push('(belum ada agent yang jalan)');
    const u0 = S.main.usage;
    L.push(`Claude (sesi utama) | ${S.main.status} | ${S.main.model || '-'} | ${u0 ? u0.in + u0.out + u0.cr + u0.cc : '-'} | ${S.main.tools} | - | ${S.main.last || '-'}`);
    const files = [];
    for (const [dk, d] of Object.entries(details)) Object.values(d.files).forEach((x) => files.push(`${dk === MAIN ? 'Claude' : dk}: ${x.path} (+${x.add} -${x.del})`));
    if (files.length) { L.push('', '## File diubah'); files.slice(0, 25).forEach((x) => L.push('- ' + x)); }
    const errs = convo.filter((c) => c.kind === 'error').slice(-5);
    if (errs.length) { L.push('', '## Error terbaru'); errs.forEach((c) => L.push(`[${hm(c.t)}] ${c.agent ? c.agent + ': ' : ''}${c.text}`)); }
    const LBL = { user: 'USER', claude: 'CLAUDE', agent: 'AGENT', question: 'PERTANYAAN', answer: 'JAWABAN USER', permission: 'MINTA IZIN', notify: 'NOTIF', error: 'ERROR' };
    L.push('', '## Percakapan terakhir (lama ke baru)');
    convo.slice(-14).forEach((c) => L.push(`[${hm(c.t)}] ${LBL[c.kind] || c.kind}${c.agent ? ' ' + c.agent : ''}: ${cap(c.text, 700).replace(/\n/g, '\n    ')}`));
    if (!convo.length) L.push('(belum ada)');
    return L.join('\n');
  }

  Object.defineProperties(run, Object.getOwnPropertyDescriptors({
    key, id, apply, applyForeign, tick, dropCompare: (did) => { droppedCmp.add(did); }, rollover, snapshot, detail, report, row,
    touch: () => onChange(run), usageAt,
    get phase() { return phase(); },
    get state() { return S; },
    get details() { return details; },
    get convo() { return convo; },
    get pending() { return pend; },
    get lifecycleSeen() { return lifecycleSeen; },
  }));
  return run;
}

module.exports = { createRun, flowCommand, asksOwner, catalogFromFlows, eqOf, rawOf, cap, norm, MAIN, BOROS };
