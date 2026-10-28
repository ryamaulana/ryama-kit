// Ringkasan docs/backlog.json per proyek untuk indikator progres (ARCHITECTURE 5.4).
// [SEC] Hanya membaca <key>/docs/backlog.json; key berasal dari cwd event (projects.js), bukan dari URL.
const fs = require('fs');
const path = require('path');

const W = { s: 1, m: 2, l: 4 };
const MAX = 2 * 1024 * 1024; // file lebih besar tidak dibaca (ARCHITECTURE 8.2)
const CACHE_MAX = 50; // proyek di memori maks 20 (ARCHITECTURE 4.1); sisanya ruang untuk proyek lama dari Riwayat
const cache = new Map(); // key -> { stamp, val }

// `Backlog` atau null bila file tidak ada, > 2 MB, atau rusak. Hasil di-cache per kunci sampai mtime/ukuran berubah.
function summarize(key) {
  if (typeof key !== 'string' || !path.isAbsolute(key)) return null;
  const f = path.join(key, 'docs', 'backlog.json');
  let val = null, stamp = '';
  try {
    const st = fs.statSync(f);
    stamp = st.mtimeMs + ':' + st.size;
    const hit = cache.get(key);
    if (hit && hit.stamp === stamp) return hit.val;
    if (st.size <= MAX) val = build(JSON.parse(fs.readFileSync(f, 'utf8')));
  } catch (_) { val = null; }
  cache.delete(key);
  if (stamp) cache.set(key, { stamp, val });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return val;
}

const str = (v) => (typeof v === 'string' ? v : '');

function build(db) {
  if (!db || !Array.isArray(db.items)) return null;
  const raw = db.items.filter((i) => i && typeof i === 'object' && !Array.isArray(i));
  const by = new Map(raw.map((i) => [str(i.id), i])); // Map: id dari file tidak menyentuh prototype
  const isDone = (n) => by.has(n) && by.get(n).status === 'done';
  // Hanya field terpilih (string) yang keluar; isi file tidak pernah dikirim mentah.
  const items = raw.map((i) => {
    const needs = Array.isArray(i.needs) ? i.needs.filter((n) => typeof n === 'string') : [];
    const status = i.status !== 'todo' ? str(i.status) : needs.every(isDone) ? 'ready' : 'waiting';
    return {
      id: str(i.id), title: str(i.title), type: str(i.type), agent: str(i.agent), status,
      needs: needs.filter((n) => !isDone(n)), owner: !!str(i.checkpoint),
      evidence: str(i.evidence), size: W[i.size] ? i.size : 'm', fase: str(i.type) || 'lain',
      checkpointQ: str(i.checkpoint), lastFailure: str(i.lastFailure)
    };
  });
  const live = items.filter((i) => i.status !== 'parked' && i.status !== 'rejected');
  const wTot = live.reduce((a, i) => a + W[i.size], 0);
  const wDone = live.filter((i) => i.status === 'done').reduce((a, i) => a + W[i.size], 0);
  const count = (s) => items.filter((i) => i.status === s).length;
  const fase = new Map();
  for (const i of live) {
    if (!fase.has(i.fase)) fase.set(i.fase, { nama: i.fase, total: 0, done: 0 });
    const g = fase.get(i.fase); g.total++; if (i.status === 'done') g.done++;
  }
  return {
    pct: wTot ? Math.round(wDone / wTot * 100) : null, done: count('done'), total: live.length,
    project: str(db.project), fase: [...fase.values()],
    parked: items.filter((i) => i.status === 'parked').map((i) => ({ id: i.id, title: i.title })),
    running: count('running'), ready: count('ready'), waiting: count('waiting'), failed: count('failed'),
    items,
    decisions: items.filter((i) => i.owner && (i.status === 'ready' || i.status === 'running'))
      .map((i) => ({ id: i.id, title: i.title, question: i.checkpointQ, status: i.status }))
  };
}

module.exports = { summarize };
