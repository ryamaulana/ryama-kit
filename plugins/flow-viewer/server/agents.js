// Katalog agent per proyek: definisi dari folder agent + tampilan dan posisi dari flows.json (ARCHITECTURE 5.7).
const fs = require('fs');
const os = require('os');
const path = require('path');

const unquote = (s) => s.trim().replace(/^(["'])(.*)\1$/, '$2');

// Frontmatter sederhana: `k: v`, `k: [a, b]`, dan daftar YAML `k:` diikuti baris `  - a`.
function parseFrontmatter(txt) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(txt);
  if (!m) return null;
  const out = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) { out[listKey].push(unquote(item[1])); continue; }
    const kv = /^([\w-]+):[ \t]*(.*)$/.exec(line);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === '') { out[k] = []; listKey = k; continue; }
    listKey = null;
    out[k] = /^\[.*\]$/.test(v.trim()) ? v.trim().slice(1, -1).split(',').map(unquote).filter(Boolean) : unquote(v);
  }
  return out;
}

const list = (v) => Array.isArray(v) ? v : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const str = (v) => Array.isArray(v) ? v.join(', ') : String(v || '');

function parseAgentFile(file) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
  const fm = parseFrontmatter(txt);
  if (!fm) return null;
  return {
    name: str(fm.name) || path.basename(file, '.md'),
    description: str(fm.description).slice(0, 220),
    model: str(fm.model), effort: str(fm.effort), tools: str(fm.tools), skills: list(fm.skills),
  };
}

const mtimeOf = (p) => { try { return fs.statSync(p).mtimeMs; } catch (_) { return null; } };

// Cache mtime per file: file diparse ulang hanya bila mtime-nya berubah. Daftar file selalu dibaca ulang
// karena mtime folder di NTFS tidak selalu berubah saat file ditambah berdekatan (agent baru bisa terlewat).
function createScanner() {
  const files = new Map(); // file -> { mtime, def }
  return function scanDir(dir) {
    let names;
    try { names = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort(); } catch (_) { return []; }
    const out = [];
    for (const f of names.map((n) => path.join(dir, n))) {
      const fm = mtimeOf(f);
      if (fm === null) { files.delete(f); continue; }
      let c = files.get(f);
      if (!c || c.mtime !== fm) { c = { mtime: fm, def: parseAgentFile(f) }; files.set(f, c); }
      if (c.def) out.push(c.def);
    }
    return out;
  };
}

const RESCAN_MS = 30_000;

// Agent baru tanpa posisi: kolom fase 1-3 yang paling sedikit isinya (seri: kolom terkecil), baris setelah yang terakhir.
function place(meta, id) {
  const inCol = (c) => meta.filter((m) => m.col === c);
  const col = [1, 2, 3].reduce((best, c) => inCol(c).length < inCol(best).length ? c : best);
  const rows = inCol(col).map((m) => m.row);
  return { id, col, row: rows.length ? Math.max(...rows) + 1 : 0 };
}

function createAgents({ pluginsDir, home, flows, now = Date.now }) {
  const scanDir = createScanner();
  const cache = new Map(); // key -> { at, catalog }

  // Pindai ulang paling cepat tiap 30 dtk; refresh(key) (SessionStart) memaksa pindai berikutnya.
  function catalogFor(key) {
    const k = key || '';
    const c = cache.get(k);
    if (c && now() - c.at < RESCAN_MS) return c.catalog;
    const catalog = build(key);
    cache.set(k, { at: now(), catalog });
    return catalog;
  }

  function refresh(key) {
    cache.delete(key || '');
    return catalogFor(key);
  }

  function build(key) {
    const defs = {};
    const shown = new Set(); // agent plugin + proyek tampil sejak awal; agent ~/.claude/agents hanya bila jalan
    let plugins = [];
    try { plugins = fs.readdirSync(pluginsDir).sort(); } catch (_) {}
    const dirs = plugins.map((p) => [path.join(pluginsDir, p, 'agents'), true]);
    dirs.push([path.join(home, '.claude', 'agents'), false]);
    if (key) dirs.push([path.join(key, '.claude', 'agents'), true]);
    for (const [d, inCrew] of dirs) for (const a of scanDir(d)) { defs[a.name] = a; if (inCrew) shown.add(a.name); }

    const free = flows.free;
    const crewMeta = free.nodes.map((n) => ({ id: n.id, col: n.col, row: n.row }));
    for (const id of [...shown].sort()) if (!crewMeta.some((m) => m.id === id)) crewMeta.push(place(crewMeta, id));
    const crew = crewMeta.map((m) => m.id);
    const look = flows.agents || {};
    const generic = (look._def && look._def.icon) || '';
    const display = {};
    for (const id of new Set([...Object.keys(look), ...Object.keys(defs), ...crew])) {
      const e = look[id] || {};
      const first = /^.*?[.!?](?=\s|$)/.exec((defs[id] && defs[id].description) || '');
      display[id] = { label: e.label || id, role: e.role || (first ? first[0] : (defs[id] && defs[id].description) || ''), icon: e.icon || generic };
    }
    const freeNodes = crewMeta.map((m) => free.nodes.find((n) => n.id === m.id) || m);
    const flow = (name) => name !== 'free' && name !== 'agents' && Object.hasOwn(flows, name)
      ? { name, title: flows[name].title, nodes: flows[name].nodes, edges: flows[name].edges }
      : { name: 'free', title: free.title, nodes: freeNodes, edges: free.edges };
    return { defs, display, crew, crewMeta, edges: free.edges, flow };
  }
  return { catalogFor, refresh };
}

module.exports = createAgents({
  pluginsDir: path.resolve(__dirname, '..', '..'), // plugins/ ryama-kit, saudara folder flow-viewer
  home: os.homedir(),
  flows: JSON.parse(fs.readFileSync(path.join(__dirname, 'flows.json'), 'utf8')),
});
module.exports.createAgents = createAgents;
