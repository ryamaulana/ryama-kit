// [SEC] Pembaca transkrip Claude Code: token, model, bukti skill.
// Dibaca inkremental dari offset terakhir per file (transkrip sesi panjang bisa puluhan MB).
// Logika hitung disalin dari parseUsage/agentUsage di server.js 1.7.1.
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHUNK = 1 << 20; // 1 MB per baca, supaya memori tetap kecil walau file besar
const MAX_ENTRIES = 256; // 12 agent x 3 proyek x beberapa kandidat path

const cache = new Map(); // key -> { file, offset, acc, p }

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function newAcc(names) {
  return {
    byId: new Map(), model: '', last: null, audits: 0, skillEv: {}, reads: new Map(), imgPaths: new Map(),
    rx: (names || []).map((nm) => ({ nm, load: new RegExp('Base directory for this skill[^"]{0,240}' + esc(nm) + '(?![\\w-])|name: ' + esc(nm) + '\\\\n(?:[^"]{0,40})?description:'), hook: nm === 'caveman' ? /caveman/i : null })),
  };
}

// filter: undefined = semua baris; 'main' = bukan sidechain; { agentId } = sidechain milik agent itu (layout lama).
function pass(filter, o) {
  if (!filter) return true;
  if (filter === 'main') return !o.isSidechain;
  return !!o.isSidechain && o.agentId === filter.agentId;
}

// Satu baris JSONL; true bila baris lengkap (JSON valid), false bila belum.
function feed(acc, line, filter) {
  let o; try { o = JSON.parse(line); } catch (_) { return false; }
  if (!o || typeof o !== 'object' || !pass(filter, o)) return true;
  if (acc.rx.length && o.type !== 'assistant' && !/tool_use_id/.test(line)) {
    for (const r of acc.rx) {
      if (acc.skillEv[r.nm]) continue;
      if (r.load.test(line)) acc.skillEv[r.nm] = 'termuat';
      else if (r.hook && r.hook.test(line) && /hook|SessionStart|additionalContext|system-reminder/i.test(line)) acc.skillEv[r.nm] = 'hook';
    }
  }
  const msg = o.type === 'assistant' && o.message && typeof o.message === 'object' ? o.message : null;
  if (!msg) return true;
  if (Array.isArray(msg.content)) {
    for (const b of msg.content) {
      if (!b || b.type !== 'tool_use' || !b.input) continue;
      if (b.name === 'Skill') { const sn = String(b.input.skill || b.input.name || '').replace(/^.*:/, ''); if (sn) acc.skillEv[sn] = 'dipanggil'; }
      const fp = typeof b.input.file_path === 'string' ? b.input.file_path : '';
      if (b.name === 'Read' && fp) {
        const k = fp.replace(/\\/g, '/');
        acc.reads.set(k, (acc.reads.get(k) || 0) + 1);
        if (/\.(png|jpe?g|webp|gif)$/i.test(k)) acc.imgPaths.set(k, (acc.imgPaths.get(k) || 0) + 1);
      }
      if (b.name === 'Bash' && /run-audit\.js/.test(String(b.input.command || ''))) acc.audits++;
    }
  }
  if (!msg.usage) return true;
  acc.byId.set(msg.id || o.uuid, msg.usage); // pesan streaming berulang dengan id sama: dihitung sekali
  acc.last = msg.usage;
  if (msg.model && msg.model !== '<synthetic>') acc.model = msg.model;
  return true;
}

function summary(acc) {
  const u = { in: 0, out: 0, cr: 0, cc: 0, turns: acc.byId.size, model: acc.model, ctx: 0, audits: acc.audits, skillEv: { ...acc.skillEv }, imgReads: 0, imgUniq: acc.imgPaths.size, dupReads: 0 };
  for (const c of acc.imgPaths.values()) u.imgReads += c;
  for (const c of acc.reads.values()) if (c > 1) u.dupReads += c - 1;
  const n = (v) => (Number.isFinite(v) ? v : 0);
  for (const x of acc.byId.values()) {
    u.in += n(x.input_tokens); u.out += n(x.output_tokens);
    u.cr += n(x.cache_read_input_tokens); u.cc += n(x.cache_creation_input_tokens);
  }
  if (acc.last) u.ctx = n(acc.last.input_tokens) + n(acc.last.cache_read_input_tokens) + n(acc.last.cache_creation_input_tokens);
  return u;
}

// Baca byte baru sejak offset; hanya baris lengkap yang dimakan, sisa dibaca lagi lain kali.
async function advance(e, filter, names) {
  let fh;
  try { fh = await fs.promises.open(e.file, 'r'); } catch (_) { return false; }
  try {
    const { size } = await fh.stat();
    if (size < e.offset) { e.offset = 0; e.acc = newAcc(names); } // file dipotong atau diganti: mulai ulang
    let pos = e.offset, rest = Buffer.alloc(0);
    while (pos < size) {
      const buf = Buffer.alloc(Math.min(CHUNK, size - pos));
      const { bytesRead } = await fh.read(buf, 0, buf.length, pos);
      if (!bytesRead) break;
      pos += bytesRead;
      let data = rest.length ? Buffer.concat([rest, buf.subarray(0, bytesRead)]) : buf.subarray(0, bytesRead);
      let start = 0, nl;
      while ((nl = data.indexOf(10, start)) !== -1) { // '\n' tidak pernah muncul di tengah karakter UTF-8
        const line = data.toString('utf8', start, nl).replace(/\r$/, '');
        if (line) feed(e.acc, line, filter);
        start = nl + 1;
      }
      e.offset = pos - (data.length - start);
      rest = data.subarray(start);
    }
    // Baris terakhir tanpa '\n': dimakan hanya bila JSON-nya sudah utuh.
    if (rest.length && feed(e.acc, rest.toString('utf8'), filter)) e.offset += rest.length;
    return true;
  } finally { await fh.close().catch(() => {}); }
}

async function readOne(file, filter, names) {
  const key = file + '\0' + JSON.stringify(filter || null) + '\0' + (names || []).join(',');
  let e = cache.get(key);
  if (!e) {
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    e = { file, offset: 0, acc: newAcc(names), p: Promise.resolve(true) };
    cache.set(key, e);
  }
  // Antrean per file: dua pemanggil bersamaan tidak memakan byte yang sama dua kali.
  e.p = e.p.then(() => advance(e, filter, names), () => advance(e, filter, names));
  return (await e.p) ? summary(e.acc) : null;
}

const WIN = process.platform === 'win32';
const inside = (root, p) => {
  const rel = path.relative(WIN ? root.toLowerCase() : root, WIN ? p.toLowerCase() : p);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
};

// [SEC] Path dari event hook tidak dipercaya: wajib .jsonl dan di bawah ~/.claude (atau CLAUDE_CONFIG_DIR),
// dicek setelah path.resolve lalu sekali lagi setelah symlink diurai. Selain itu null (diabaikan).
async function safePath(p) {
  if (typeof p !== 'string' || !p || p.includes('\0') || !p.endsWith('.jsonl')) return null;
  const root = path.resolve(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));
  const abs = path.resolve(p);
  if (!inside(root, abs)) return null;
  try {
    const [realRoot, real] = await Promise.all([fs.promises.realpath(root), fs.promises.realpath(abs)]);
    return inside(realRoot, real) && real.endsWith('.jsonl') ? abs : null;
  } catch (_) { return null; }
}

// Kandidat dicoba berurutan; Usage pertama yang punya giliran (turns) dipakai.
async function readUsage(paths, { filter, skillNames } = {}) {
  for (const p of paths || []) {
    const f = await safePath(p);
    if (!f) continue;
    const u = await readOne(f, filter, skillNames);
    if (u && u.turns) return u;
  }
  return null;
}

// Usage satu subagent: file transkrip sendiri bila ada, kalau tidak sidechain di transkrip utama (layout lama).
async function agentUsage(ev, agentId, names) {
  const tp = typeof ev.transcript_path === 'string' ? ev.transcript_path : '';
  const id = typeof agentId === 'string' ? agentId : '';
  const cands = [];
  if (ev.agent_transcript_path) cands.push(ev.agent_transcript_path);
  if (tp && id) {
    const dir = path.dirname(tp), sid = typeof ev.session_id === 'string' && ev.session_id ? ev.session_id : path.basename(tp, '.jsonl');
    // safePath tetap jadi penjaga: id/sid berisi '..' tidak bisa keluar dari akar.
    cands.push(path.join(dir, sid, 'subagents', `agent-${id}.jsonl`), path.join(dir, `agent-${id}.jsonl`));
  }
  return (await readUsage(cands, { skillNames: names }))
    || (tp && id ? readUsage([tp], { filter: { agentId: id }, skillNames: names }) : null);
}

module.exports = { readUsage, agentUsage, safePath };
