// Penyimpanan riwayat run untuk flow-viewer.
// Utama: SQLite lewat modul bawaan node:sqlite (Node 22.5+), satu file, tanpa dependensi.
// Cadangan: satu file JSON per run (kalau node:sqlite tidak ada). API sama, jadi server tidak peduli.
// Semua operasi menelan error: gagal menyimpan riwayat tidak boleh mengganggu viewer.
const fs = require('fs');
const path = require('path');

const KEEP = 200; // jumlah run terakhir yang disimpan

function openSqlite(file) {
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) { return null; }
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY, project TEXT, flow TEXT, title TEXT, prompt TEXT,
      started_at INTEGER, updated_at INTEGER, finished INTEGER,
      tokens_eq INTEGER, tokens_raw INTEGER, agents_ran INTEGER, files INTEGER,
      state TEXT, convo TEXT
    );
    CREATE INDEX IF NOT EXISTS runs_project ON runs(project, started_at DESC);`);
  const up = db.prepare(`INSERT INTO runs (id, project, flow, title, prompt, started_at, updated_at, finished, tokens_eq, tokens_raw, agents_ran, files, state, convo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET project=excluded.project, flow=excluded.flow, title=excluded.title, prompt=excluded.prompt,
      updated_at=excluded.updated_at, finished=excluded.finished, tokens_eq=excluded.tokens_eq, tokens_raw=excluded.tokens_raw,
      agents_ran=excluded.agents_ran, files=excluded.files, state=excluded.state, convo=excluded.convo`);
  const cols = 'id, project, flow, title, prompt, started_at, updated_at, finished, tokens_eq, tokens_raw, agents_ran, files';
  const listAll = db.prepare(`SELECT ${cols} FROM runs ORDER BY started_at DESC LIMIT ?`);
  const listProj = db.prepare(`SELECT ${cols} FROM runs WHERE project = ? ORDER BY started_at DESC LIMIT ?`);
  const get = db.prepare('SELECT * FROM runs WHERE id = ?');
  const del = db.prepare('DELETE FROM runs WHERE id = ?');
  const prune = db.prepare('DELETE FROM runs WHERE id NOT IN (SELECT id FROM runs ORDER BY started_at DESC LIMIT ?)');
  return {
    kind: 'sqlite',
    save(r) { up.run(r.id, r.project, r.flow, r.title, r.prompt, r.started_at, r.updated_at, r.finished ? 1 : 0, r.tokens_eq, r.tokens_raw, r.agents_ran, r.files, r.state, r.convo); prune.run(KEEP); },
    list(project, limit) { return (project ? listProj.all(project, limit) : listAll.all(limit)).map((x) => ({ ...x })); },
    get(id) { const x = get.get(id); return x ? { ...x } : null; },
    remove(id) { del.run(id); },
  };
}

function openJson(dir) {
  const hd = path.join(dir, 'history');
  fs.mkdirSync(hd, { recursive: true });
  const meta = (r) => ({ id: r.id, project: r.project, flow: r.flow, title: r.title, prompt: r.prompt, started_at: r.started_at, updated_at: r.updated_at, finished: r.finished ? 1 : 0, tokens_eq: r.tokens_eq, tokens_raw: r.tokens_raw, agents_ran: r.agents_ran, files: r.files });
  const ids = () => fs.readdirSync(hd).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5))).sort((a, b) => b - a);
  const read = (id) => { try { return JSON.parse(fs.readFileSync(path.join(hd, id + '.json'), 'utf8')); } catch (_) { return null; } };
  return {
    kind: 'json',
    save(r) { fs.writeFileSync(path.join(hd, r.id + '.json'), JSON.stringify(r)); ids().slice(KEEP).forEach((id) => { try { fs.unlinkSync(path.join(hd, id + '.json')); } catch (_) {} }); },
    list(project, limit) { const out = []; for (const id of ids()) { const r = read(id); if (r && (!project || r.project === project)) out.push(meta(r)); if (out.length >= limit) break; } return out; },
    get(id) { return read(id); },
    remove(id) { try { fs.unlinkSync(path.join(hd, id + '.json')); } catch (_) {} },
  };
}

function open(dir) {
  try { const s = process.env.FLOW_VIEWER_STORE === 'json' ? null : openSqlite(path.join(dir, 'history.db')); if (s) return s; } catch (_) { /* jatuh ke JSON */ }
  try { return openJson(dir); } catch (_) { return null; }
}

module.exports = { open };
