// Analisis token dari transkrip Claude Code (JSONL): per pemanggilan agent dan untuk sesi utama.
// Tujuan: menjawab "token bocor dari mana" tanpa menebak. Biaya satu giliran ~ seluruh konteks yang dibaca ulang,
// jadi yang dicatat: jumlah giliran, konteks awal/puncak/akhir, output tool yang masuk konteks, cache yang ditulis ulang,
// laporan subagent yang masuk ke orkestrator, dan kejadian limit.
// Tanpa dependensi. Semua angka token dari field usage transkrip; ukuran output tool hanya perkiraan (karakter / 4, gambar ~1.600).
'use strict';

const IMG_TOK = 1600;          // perkiraan token satu gambar di konteks
const COLD_MIN = 20000;        // cache tulis minimal agar dianggap "ditulis ulang"
const COLD_SHARE = 0.6;        // ...dan minimal 60% dari konteks giliran itu
const TOP = 8;

const itemOf = (s) => ((/\bITEM\s+([a-z0-9][a-z0-9-]*)/.exec(String(s || '')) || [])[1] || '');
const one = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const norm = (n) => String(n || '').split(':').pop().trim();

function whatOf(name, i) {
  i = i || {};
  if (name === 'Agent' || name === 'Task') { const it = itemOf(i.prompt); return norm(i.subagent_type) + (it ? ' ' + it : ''); }
  return one(i.file_path || i.notebook_path || i.command || i.pattern || i.skill || i.url || i.query || i.description || '', 90);
}

function sizeOf(c) {
  if (typeof c === 'string') return { chars: c.length, imgs: 0 };
  let chars = 0, imgs = 0;
  if (Array.isArray(c)) for (const x of c) {
    if (!x) continue;
    if (x.type === 'image') imgs++;
    else if (typeof x.text === 'string') chars += x.text.length;
    else if (x.content) { const r = sizeOf(x.content); chars += r.chars; imgs += r.imgs; }
  }
  return { chars, imgs };
}

function userText(c) {
  if (typeof c === 'string') return c;
  if (!Array.isArray(c) || c.some((x) => x && x.type === 'tool_result')) return '';
  return c.filter((x) => x && x.type === 'text').map((x) => x.text || '').join('\n');
}

// text: isi JSONL. opts.filter(o): baris yang dipakai. opts.from/opts.to (ms): jendela waktu (sesi utama yang melewati beberapa run).
function analyze(text, opts = {}) {
  const { filter, from = 0, to = Infinity } = opts;
  const turns = new Map();   // id pesan -> { u, t, model } (pesan streaming dengan id sama: yang terakhir menang)
  const uses = new Map();    // tool_use_id -> { name, what }
  const tools = {}, outTok = {};
  const heavy = [], handbacks = [], limits = [];
  let prompt = '', imgs = 0, t0 = 0, t1 = 0;
  for (const line of String(text || '').split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch (_) { continue; }
    if (!o || typeof o !== 'object' || (filter && !filter(o))) continue;
    const t = Date.parse(o.timestamp) || 0;
    if (t && (t < from || t > to)) continue;
    if (t) { if (!t0) t0 = t; t1 = t; }
    const m = o.message && typeof o.message === 'object' ? o.message : null;
    if (!m) continue;
    if (o.type === 'user') {
      // Laporan agent latar masuk sebagai pesan sistem (task-notification), bukan sebagai hasil tool Agent.
      const ut = userText(m.content);
      if (ut && /^\s*<(task-notification|agent-message)\b|\[Subagent hand-back\]/.test(ut)) {
        const to = ((/<(?:subagent_type|agent_type|agent)>([^<]+)</.exec(ut) || [])[1] || (/subagent_type["':\s]+([\w:-]+)/.exec(ut) || [])[1] || 'agent latar');
        const it = itemOf(ut);
        handbacks.push({ to: norm(to) + (it ? ' ' + it : ''), chars: ut.length, t });
        continue;
      }
      if (!prompt && !o.isMeta) { const p = userText(m.content); if (p && !/^<(command|local-command|system-reminder)/.test(p)) prompt = p; }
      if (Array.isArray(m.content)) for (const b of m.content) {
        if (!b || b.type !== 'tool_result') continue;
        const u = uses.get(b.tool_use_id) || { name: '?', what: '' };
        const r = sizeOf(b.content);
        const tok = Math.round(r.chars / 4) + r.imgs * IMG_TOK;
        imgs += r.imgs;
        outTok[u.name] = (outTok[u.name] || 0) + tok;
        heavy.push({ tool: u.name, what: u.what, tok, t });
        if ((u.name === 'Agent' || u.name === 'Task') && !u.bg) handbacks.push({ to: u.what, chars: r.chars, t }); // agent latar: hasil tool hanya tanda mulai
      }
      continue;
    }
    if (o.type !== 'assistant') continue;
    if (Array.isArray(m.content)) for (const b of m.content) {
      if (!b) continue;
      if (b.type === 'tool_use') { uses.set(b.id, { name: b.name, what: whatOf(b.name, b.input), bg: !!(b.input && b.input.run_in_background) }); tools[b.name] = (tools[b.name] || 0) + 1; }
      if (b.type === 'text' && (o.isApiErrorMessage || m.model === '<synthetic>') && /limit|quota/i.test(b.text || '')) limits.push({ t, text: one(b.text, 160) });
    }
    if (!m.usage || m.model === '<synthetic>') continue;
    const id = m.id || o.uuid;
    const prev = turns.get(id);
    turns.set(id, { u: m.usage, t: prev ? prev.t : t, model: m.model || (prev && prev.model) || '' });
  }

  const n = (v) => (Number.isFinite(v) ? v : 0);
  const A = { item: itemOf(prompt), prompt: one(prompt, 240), turns: turns.size, in: 0, out: 0, cr: 0, cc: 0, ctxFirst: 0, ctxPeak: 0, ctxLast: 0, t0, t1, model: '', byModel: {}, tools, outTok, imgs, cold: [], coldTok: 0, heavy: [], handbacks: [], limits };
  let i = 0, lastT = 0;
  for (const x of turns.values()) {
    const u = x.u, ctx = n(u.input_tokens) + n(u.cache_read_input_tokens) + n(u.cache_creation_input_tokens);
    const raw = ctx + n(u.output_tokens);
    A.in += n(u.input_tokens); A.out += n(u.output_tokens); A.cr += n(u.cache_read_input_tokens); A.cc += n(u.cache_creation_input_tokens);
    if (!i) A.ctxFirst = ctx;
    A.ctxPeak = Math.max(A.ctxPeak, ctx); A.ctxLast = ctx;
    const md = String(x.model || '').replace(/^claude-/, '');
    if (md) { A.model = md; A.byModel[md] = (A.byModel[md] || 0) + raw; }
    const cc = n(u.cache_creation_input_tokens);
    if (i && cc >= COLD_MIN && cc >= COLD_SHARE * ctx) { A.cold.push({ t: x.t, gapMin: lastT && x.t ? Math.round((x.t - lastT) / 60000) : null, cc }); A.coldTok += cc; }
    if (x.t) lastT = x.t;
    i++;
  }
  A.raw = A.in + A.out + A.cr + A.cc;
  A.heavy = heavy.sort((a, b) => b.tok - a.tok).slice(0, TOP);
  A.cold = A.cold.sort((a, b) => b.cc - a.cc).slice(0, 20);
  const hb = handbacks.map((h) => h.chars);
  A.handbacks = { n: hb.length, avg: hb.length ? Math.round(hb.reduce((a, b) => a + b, 0) / hb.length) : 0, max: hb.length ? Math.max(...hb) : 0, top: handbacks.sort((a, b) => b.chars - a.chars).slice(0, 5) };
  return A;
}

const eqOf = (u) => (u ? Math.round((u.in || 0) + (u.cc || 0) * 1.25 + (u.cr || 0) * 0.1 + (u.out || 0) * 5) : 0);

module.exports = { analyze, itemOf, eqOf };
