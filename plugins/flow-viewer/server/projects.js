'use strict';
// Registry proyek: kunci folder, ikatan sesi, run per proyek. Aturan: docs/ARCHITECTURE.md 4.3, docs/adr/0002.
const path = require('path');
const crypto = require('crypto');
const { createRun, flowCommand } = require('./run');

const ACTIVE_MS = 6 * 3600 * 1000;
const MAX_PROJECTS = 20;
const MAX_BINDINGS = 1000;
const NO_FOLDER = '(tanpa folder)';
const WIN = process.platform === 'win32';
const fold = (s) => (WIN ? s.toLowerCase() : s);

function normKey(cwd) {
  if (typeof cwd !== 'string' || cwd.length > 1024 || !path.isAbsolute(cwd)) return '';
  let k = path.resolve(cwd);
  if (WIN) k = k.replace(/^[a-z]:/, (d) => d.toUpperCase());
  return k;
}
const inside = (child, parent) => { const c = fold(child), p = fold(parent); return c === p || c.startsWith(p.endsWith(path.sep) ? p : p + path.sep); };
const nameOf = (key) => (key === NO_FOLDER ? key : path.basename(key) || key);
const slugOf = (key) => nameOf(key).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[^a-z0-9]+/, '').slice(0, 48).replace(/-+$/, '') || 'proyek';
const hash6 = (key) => crypto.createHash('sha1').update(key).digest('hex').slice(0, 6);

// catalog: objek dengan catalogFor(key), atau katalog langsung. watched(p): ada penonton di proyek ini?
function createRegistry({ store = null, catalog, now = Date.now, watched = () => false, runOpts = () => ({}) } = {}) {
  const mem = new Map();      // key -> project
  const bindings = new Map(); // session_id -> key
  let hist = null;            // kunci dari riwayat, dimuat sekali dan diperbarui di sweep()

  const catFor = (key) => (typeof catalog.catalogFor === 'function' ? catalog.catalogFor(key) : catalog);
  const history = () => {
    if (!hist) { try { hist = new Map((store ? store.projects() : []).map((r) => [r.project, r])); } catch (_) { hist = new Map(); } }
    return hist;
  };
  const known = () => [...new Set([...mem.keys(), ...history().keys()])];
  const idOf = (key) => { const s = slugOf(key); return known().some((k) => k !== key && slugOf(k) === s) ? `${s}-${hash6(key)}` : s; };

  function make(key) {
    const parts = key.split(/[\\/]+/).filter(Boolean);
    return {
      key, name: nameOf(key), shortPath: parts.slice(-2).join('/') || key,
      lastEventAt: 0, sessionId: '', run: null,
      get id() { return idOf(key); },
    };
  }
  const isActive = (p) => now() - p.lastEventAt < ACTIVE_MS;
  const byRecent = () => [...mem.values()].sort((a, b) => b.lastEventAt - a.lastEventAt);

  function saveRun(p) { try { const r = store && p.run && p.run.row(p.key); if (r) store.save(r); } catch (_) { /* riwayat tidak boleh mengganggu viewer */ } }
  function evict(p) {
    saveRun(p); mem.delete(p.key);
    for (const [s, k] of bindings) if (k === p.key) bindings.delete(s);
    history().set(p.key, { project: p.key });
  }

  function keyFor(ev) {
    const sid = typeof ev.session_id === 'string' ? ev.session_id : '';
    if (sid && bindings.has(sid)) return bindings.get(sid);
    const cwd = normKey(ev.cwd);
    let key;
    if (cwd) {
      // induk terluar yang dikenal menang; kunci lama dari subfolder (1.7.1) tidak boleh menarik sesi ke dirinya
      const parents = known().filter((k) => k !== NO_FOLDER && inside(cwd, k)).sort((a, b) => a.length - b.length);
      key = parents[0] || cwd;
    } else {
      const latest = byRecent().find(isActive);
      key = latest ? latest.key : NO_FOLDER;
    }
    if (sid) { bindings.set(sid, key); if (bindings.size > MAX_BINDINGS) bindings.delete(bindings.keys().next().value); }
    return key;
  }

  function startRun(p, flow, opts = {}) {
    saveRun(p);
    p.run = createRun({
      key: p.key, flow, catalog: catFor(p.key), now, prev: p.run, ...opts,
      project: () => ({ id: p.id, name: p.name, shortPath: p.shortPath }), // id bisa berubah saat slug kembar muncul
      compare: store && store.previous ? (q) => store.previous(p.key, q.flow, q.beforeId, q.withAgents) : null,
      ...runOpts(p),
    });
  }

  function ingest(ev) {
    if (!ev || typeof ev !== 'object') return null;
    const key = keyFor(ev);
    let p = mem.get(key);
    if (!p) {
      if (mem.size >= MAX_PROJECTS) { const old = byRecent().reverse().find((x) => !watched(x)); if (old) evict(old); }
      p = make(key); mem.set(key, p); history().set(key, history().get(key) || { project: key });
      if (ev.session_id) bindings.set(ev.session_id, key); // no-op bila sudah terikat; menjamin ikatan setelah eviksi
    }
    p.lastEventAt = now();
    const sid = typeof ev.session_id === 'string' ? ev.session_id : '';
    const cat = catFor(key);
    const fk = flowCommand(ev, new Proxy({}, { get: (_, k) => cat.flow(k) }));
    let ok;
    if (!p.run || fk || p.run.rollover(ev)) {
      startRun(p, fk || 'free');
      if (sid) p.sessionId = sid;
      ok = p.run.apply(ev);
    } else if (sid && p.sessionId && sid !== p.sessionId) {
      ok = p.run.applyForeign(ev); // sesi lama: hanya pertanyaan/izin
    } else {
      if (sid && !p.sessionId) p.sessionId = sid;
      ok = p.run.apply(ev);
    }
    return ok ? p : null;
  }

  // Proyek hidup, atau (dari riwayat) proyek tanpa run. Bentuk pendek hanya bila unik; bentuk ber-hash selalu.
  function resolve(p) {
    if (typeof p !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(p)) return null;
    const keys = known();
    const hit = keys.find((k) => p === `${slugOf(k)}-${hash6(k)}` || (p === slugOf(k) && idOf(k) === p));
    if (!hit) return null;
    if (mem.has(hit)) return mem.get(hit);
    const h = history().get(hit) || {};
    return { ...make(hit), lastEventAt: h.last_at || 0, live: false };
  }

  // Proyek di memori yang lewat 6 jam, ditambah proyek dari Riwayat yang tidak di memori (maks 50, terbaru dulu).
  function inactive() {
    return known().filter((k) => !(mem.has(k) && isActive(mem.get(k)))).map((k) => {
      const m = mem.get(k), h = history().get(k) || {}, v = m || make(k);
      return { id: v.id, name: v.name, shortPath: v.shortPath, lastEventAt: m ? m.lastEventAt : h.last_at || 0 };
    }).sort((a, b) => b.lastEventAt - a.lastEventAt).slice(0, 50);
  }
  // Reset run: hanya proyek itu; null bila proyek tidak di memori.
  function reset(key) {
    const p = mem.get(key);
    if (!p) return null;
    startRun(p, p.run ? p.run.state.flow : 'free', { fresh: true });
    return p;
  }
  const list = () => byRecent().filter(isActive);
  const latest = () => list()[0] || null;
  function sweep() {
    hist = null;
    for (const p of [...mem.values()]) if (!isActive(p) && !watched(p)) evict(p);
  }
  return { all: () => [...mem.values()], ingest, resolve, latest, list, sweep, inactive, reset, isActive, idFor: idOf };
}

module.exports = { createRegistry, normKey, slugOf };
