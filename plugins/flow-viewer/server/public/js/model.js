// Turunan data dari snapshot server untuk tampilan. Fungsi murni: tidak menyentuh DOM.
// Snapshot 1.7.1 adalah dasar; field baru (phase, attention, progress, tokens, summary) dipakai bila ada,
// kalau tidak, nilainya dihitung di sini supaya tampilan tetap benar terhadap server lama.
import { eqOf, rawOf } from './format.js';
import { DN, metaOf } from './icons.js';

export const MAIN = '__main';
export const PROMPT = '__prompt';

export const crewIds = (S) => (S.crewMeta && S.crewMeta.length ? S.crewMeta.map((m) => m.id) : S.crew || Object.keys(S.nodes || {}));

export function ranAny(S) {
  return Object.values(S.nodes || {}).some((n) => n.count > 0 || n.status === 'running' || n.status === 'done');
}

export function attentionItems(S) {
  if (Array.isArray(S.attention)) return S.attention;
  const out = [];
  if (S.pending && S.pending.text) {
    out.push({ key: 'q:' + (S.pending.at || 0), kind: S.pending.kind || 'question', agent: S.pending.agent || MAIN, text: S.pending.text, options: S.pending.options || [], at: S.pending.at || 0 });
  }
  const items = (S.backlog && S.backlog.items) || [];
  for (const it of items) {
    if (it.owner && (it.status === 'ready' || it.status === 'running')) {
      out.push({ key: 'dec:' + it.id, kind: 'decision', agent: it.agent || '', text: it.title, options: [], at: 0, detail: it.checkpointQ || '' });
    }
  }
  for (const [id, n] of Object.entries(S.nodes || {})) {
    if (n.status === 'error' || n.status === 'failed' || n.failReason) {
      out.push({ key: 'fail:' + (S.runId || 0) + ':' + id, kind: 'failed', agent: id, text: n.failReason || n.last || 'gagal', options: [], at: n.endedAt || 0 });
    }
  }
  if (S.finished && ranAny(S)) out.push({ key: 'done:' + (S.runId || 0), kind: 'done', agent: '', text: 'Run selesai', options: [], at: S.updatedAt || 0 });
  return out;
}
export const needsInput = (items) => items.filter((a) => a.kind === 'question' || a.kind === 'permission' || a.kind === 'decision');

// Status tampilan satu agent: idle, running, done, skipped, input, failed.
export function nodeStatus(S, id, items = attentionItems(S)) {
  const n = (S.nodes || {})[id];
  if (!n) return 'idle';
  if (n.status === 'failed' || n.status === 'error' || n.failReason) return 'failed';
  if (items.some((a) => a.agent === id && (a.kind === 'question' || a.kind === 'permission'))) return 'input';
  if (n.status === 'running') return 'running';
  if (n.status === 'done') return 'done';
  if (n.status === 'skipped') return 'skipped';
  if (S.finished && (S.expected || []).includes(id) && !n.count) return 'skipped';
  return 'idle';
}
export function mainStatus(S, items = attentionItems(S)) {
  if (items.some((a) => (a.agent === MAIN || !a.agent) && (a.kind === 'question' || a.kind === 'permission'))) return 'input';
  const m = S.main || {};
  if (S.finished) return 'done';
  return m.status === 'running' ? 'running' : 'idle';
}

// Tata letak: kolom 0 = Prompt dan sesi utama; agent mengikuti col/row dari server; agent tak dikenal di kolom berikutnya.
export function layout(S) {
  const tiles = [{ id: PROMPT, col: 0, row: 0 }, { id: MAIN, col: 0, row: 1 }];
  const known = new Set();
  let maxCol = 3;
  for (const m of S.crewMeta || []) { tiles.push({ id: m.id, col: m.col, row: m.row }); known.add(m.id); maxCol = Math.max(maxCol, m.col); }
  let r = 0;
  for (const id of Object.keys(S.nodes || {})) {
    if (!known.has(id)) { tiles.push({ id, col: maxCol + 1, row: r++, extra: true }); known.add(id); }
  }
  const edges = ((S.edges && S.edges.length ? S.edges : S.crewEdges) || []).filter(([a, b]) => known.has(a) && known.has(b));
  const hasIn = new Set(edges.map((e) => e[1]));
  const all = [[PROMPT, MAIN]];
  const ids = tiles.filter((t) => t.id !== PROMPT && t.id !== MAIN && !t.extra).map((t) => t.id);
  const flowIds = (S.expected && S.expected.length ? S.expected : ids);
  for (const id of ids) if (!hasIn.has(id) && (flowIds.includes(id) || !S.expected)) all.push([MAIN, id]);
  return { tiles, edges: all.concat(edges) };
}

export function tokens(S) {
  const rows = [];
  let eq = 0, raw = 0, any = false;
  const add = (id, label, u) => {
    if (!u) return;
    const e = eqOf(u); any = true; eq += e; raw += rawOf(u);
    rows.push({ id, label, u, eq: e, raw: rawOf(u) });
  };
  add(MAIN, 'Claude Orkestrator', (S.main || {}).usage);
  for (const [id, n] of Object.entries(S.nodes || {})) add(id, metaOf(id, S).label, n.usage);
  rows.sort((a, b) => b.eq - a.eq);
  const total = S.tokens && S.tokens.eq != null ? S.tokens.eq : (any ? eq : null);
  for (const r of rows) r.pct = total ? Math.round((r.eq / total) * 100) : 0;
  return { rows, eq: total, raw: S.tokens && S.tokens.raw != null ? S.tokens.raw : (any ? raw : null), deltaPct: S.tokens ? S.tokens.deltaPct : null, waiting: !any && ranAny(S) };
}

export function progress(S) {
  const b = S.backlog;
  if (S.progress && S.progress.pct != null) return { pct: S.progress.pct, label: S.progress.label || '', kind: 'backlog' };
  if (b && b.total) return { pct: b.pct, label: `${b.done} dari ${b.total} item`, kind: 'backlog' };
  const exp = S.expected || [];
  if (exp.length) {
    const ran = exp.filter((id) => ((S.nodes || {})[id] || {}).count > 0).length;
    return { pct: Math.round((ran / exp.length) * 100), label: `${ran} dari ${exp.length} langkah wajib`, kind: 'flow' };
  }
  return { pct: null, label: '', kind: 'none' };
}

export function counts(S) {
  const items = attentionItems(S);
  const c = { running: 0, done: 0, input: 0, failed: 0, idle: 0, skipped: 0, total: 0, names: [] };
  for (const id of crewIds(S)) {
    const st = nodeStatus(S, id, items); c[st]++; c.total++;
    if (st === 'running' || st === 'input') c.names.push(metaOf(id, S).label);
  }
  if (mainStatus(S, items) === 'input') c.names.unshift('Claude');
  return c;
}

export function longest(S) {
  let best = null;
  for (const [id, n] of Object.entries(S.nodes || {})) if (n.ms && (!best || n.ms > best.ms)) best = { id, ms: n.ms, label: metaOf(id, S).label };
  return best;
}

export function duration(S, now = Date.now()) {
  if (!S.startedAt) return null;
  const end = S.finished ? (S.updatedAt || now) : now;
  return Math.max(0, end - S.startedAt);
}

export function phase(S) {
  if (S.phase) return S.phase;
  if (S.finished) return 'finished';
  if (Object.values(S.nodes || {}).some((n) => n.status === 'running') || (S.main || {}).status === 'running') return 'running';
  return 'idle';
}

// Ringkasan sesi utama untuk kartu di bawah node Claude.
export function mainCard(S) {
  const m = S.main || {};
  const u = m.usage || null;
  const skills = (S.skillCalls || []).filter((c) => !c.agent || c.agent === MAIN).map((c) => c.name);
  return { model: m.model || (u && u.model) || '', turns: u ? u.turns : null, ctx: u ? u.ctx : null, skills: Array.from(new Set(skills.concat(S.mainSkills || []))), tools: m.tools || 0, lastTool: m.last || '' };
}

export const agentLabel = (id, S) => (id === MAIN ? 'Claude Orkestrator' : id === PROMPT ? 'Prompt kamu' : metaOf(id, S).label || DN[id] || id);
