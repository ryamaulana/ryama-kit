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
    ...bySection(items, raw.map((i) => str(i.slice).trim())),
    pct: wTot ? Math.round(wDone / wTot * 100) : null, done: count('done'), total: live.length,
    project: str(db.project), fase: [...fase.values()],
    parked: items.filter((i) => i.status === 'parked').map((i) => ({ id: i.id, title: i.title })),
    running: count('running'), ready: count('ready'), waiting: count('waiting'), failed: count('failed'),
    items,
    decisions: items.filter((i) => i.owner && (i.status === 'ready' || i.status === 'running'))
      .map((i) => ({ id: i.id, title: i.title, question: i.checkpointQ, status: i.status }))
  };
}

// ---- Backlog per bagian (PRD F11, UX 6.3) ----
const TYPE_LABEL = { ui: 'Tampilan', fe: 'Penyambungan', be: 'Server', qa: 'Uji', sec: 'Keamanan', review: 'Review', 'review-kode': 'Review', keputusan: 'Keputusan' };
const SECTION_STATES = [['decision', 'Butuh keputusan'], ['stuck', 'Macet'], ['running', 'Berjalan'], ['notstarted', 'Belum mulai'], ['done', 'Selesai']];
const ITEM_STATES = { decision: 'Perlu keputusan', failed: 'Gagal', running: 'Berjalan', ready: 'Siap', waiting: 'Menunggu', done: 'Selesai' };
const ITEM_RANK = { decision: 0, failed: 1, running: 2, ready: 3, waiting: 4, done: 5 };
const COLLAPSE_OVER = 20;

// "detail-node" -> "Detail node"; teks kosong -> ''.
const plain = (s) => { const t = s.replace(/[-_]+/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : ''; };
const typeLabel = (t) => TYPE_LABEL[t] || plain(t) || 'Lainnya';

// `items`: hasil build (status turunan); `slices[k]`: slice mentah item ke-k. Mengembalikan { sections, answer, parkedGroup, sliced }.
function bySection(items, slices) {
  const title = new Map(items.map((i) => [i.id, i.title]));
  const sliced = slices.some((s) => s);
  const groups = new Map(); // Map: nama dari file tidak menyentuh prototype
  const parkedGroup = [];
  items.forEach((i, k) => {
    if (i.status === 'parked' || i.status === 'rejected') {
      parkedGroup.push({ id: i.id, title: i.title, label: i.status === 'parked' ? 'Diparkir' : 'Ditolak' });
      return;
    }
    const name = sliced ? (plain(slices[k]) || 'Tanpa bagian') : typeLabel(i.type);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(i);
  });

  const sections = [...groups].map(([name, list]) => {
    const rows = list.map((i) => {
      const state = i.owner && (i.status === 'ready' || i.status === 'running') ? 'decision'
        : ITEM_RANK[i.status] !== undefined && i.status !== 'decision' ? i.status : 'waiting';
      const waitingFor = state === 'waiting' ? i.needs.slice(0, 2).map((id) => ({ id, title: title.get(id) || id })) : [];
      const waitingMore = state === 'waiting' ? Math.max(0, i.needs.length - 2) : 0;
      const context = state === 'decision' ? i.checkpointQ : state === 'failed' ? i.lastFailure
        : waitingFor.length ? 'Menunggu: ' + waitingFor.map((w) => w.title).join(', ') + (waitingMore ? ` +${waitingMore}` : '') : '';
      return { id: i.id, title: i.title, type: i.type, typeLabel: typeLabel(i.type), state, stateLabel: ITEM_STATES[state], context, waitingFor, waitingMore };
    }).sort((a, b) => ITEM_RANK[a.state] - ITEM_RANK[b.state]); // sort stabil: urutan file dipertahankan
    const has = (s) => rows.some((r) => r.state === s);
    const done = rows.filter((r) => r.state === 'done').length;
    const decisionReady = list.some((i) => i.owner && i.status === 'ready');
    const stuck = has('failed') || (done < rows.length && !list.some((i) => i.status === 'ready' || i.status === 'running'));
    const state = decisionReady ? 'decision' : stuck ? 'stuck' : done === rows.length ? 'done' : list.some((i) => i.status === 'running') || done ? 'running' : 'notstarted';
    const collapse = rows.length > COLLAPSE_OVER ? done : 0;
    return {
      name, state, stateLabel: SECTION_STATES.find((s) => s[0] === state)[1], done, total: rows.length,
      doneCollapsed: collapse, items: collapse ? rows.filter((r) => r.state !== 'done') : rows
    };
  });
  const rank = (s) => SECTION_STATES.findIndex((x) => x[0] === s.state);
  sections.sort((a, b) => rank(a) - rank(b));

  const macet = sections.filter((s) => s.state === 'stuck').length;
  const decisions = items.filter((i) => i.owner && i.status === 'ready').length;
  // "Berikutnya" = item siap teratas menurut urutan layar; keputusan dilewati karena sudah dihitung di "menunggu kamu".
  const nextRow = sections.flatMap((s) => s.items).find((r) => r.state === 'ready');
  const next = nextRow ? { id: nextRow.id, title: nextRow.title } : null;
  const parts = [];
  if (macet) parts.push(`${macet} bagian macet`);
  if (decisions) parts.push(`${decisions} keputusan menunggu kamu`);
  parts.push(next ? 'Berikutnya: ' + next.title : 'Tidak ada item siap');
  const lead = !sliced && sections.length ? 'Backlog ini belum dibagi per bagian · ' : '';
  return { sections, parkedGroup, sliced, answer: { macet, decisions, next, text: lead + parts.join(' · ') } };
}

module.exports = { summarize };
