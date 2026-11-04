// Grafik workflow live (F2): tata letak dari crewMeta (kolom per fase), node penuh/ringkas, konektor kurva.
// Murni di atas: layoutTiles, layoutEdges, pickView, edgePath, nodeVm (tanpa DOM, diuji unit). Bawah: initGraph (DOM).
// Pembaruan berkunci tanda tangan: node ditulis ulang hanya bila tanda tangannya berubah; konektor lewat patch().
// Zoom (tombol, +/-/0, Ctrl+scroll), pan (tarik, gulir), Pas layar (tombol, klik dua kali di latar), seleksi + fokus node, event fv-pick (t16b).
import { html, raw, patch } from './dom.js';
import { statusIcon, statusKey, statusLabel } from './icons.js';
import { fmtTok, fmtClock, eqOf } from './format.js';

export const MAIN = '__main';
export const PROMPT = '__prompt';
// Cermin variabel CSS --node-*/--nodec-* (app.css); initGraph membacanya dari CSS, ini cadangan dan nilai uji.
export const DIM = { full: { w: 232, h: 122, gx: 40, gy: 14 }, compact: { w: 188, h: 84, gx: 40, gy: 12 } };
export const MIN_COMPACT = 0.89; // DESIGN 4: 14 px x 0,89 = 12,5 px; di bawahnya grafik dipan, tidak dikecilkan
const GUIDE = 'Belum ada run. Mulai sesi Claude di proyek ini, lalu agent menyala di sini saat bekerja.';

export const asks = (S) => (Array.isArray(S.attention) ? S.attention : S.pending && S.pending.text ? [S.pending] : [])
  .filter((a) => !a.kind || a.kind === 'question' || a.kind === 'permission');
export const ranAny = (S) => Object.values(S.nodes || {}).some((n) => n.count > 0 || n.status === 'running' || n.status === 'done');
export const isEmptyRun = (S) => !S.prompt && !ranAny(S) && (S.main || {}).status !== 'running';

// ---------- Tata letak ----------
export function layoutTiles(S) {
  const tiles = [{ id: PROMPT, kind: 'prompt', col: 0, row: 0 }, { id: MAIN, kind: 'main', col: 0, row: 1 }];
  const used = new Set(['0,0', '0,1']);
  const known = new Set();
  const put = (t) => { while (used.has(t.col + ',' + t.row)) t.row++; used.add(t.col + ',' + t.row); known.add(t.id); tiles.push(t); };
  for (const m of S.crewMeta || []) {
    if (!known.has(m.id)) put({ id: m.id, kind: 'agent', col: Math.max(1, m.col | 0), row: Math.max(0, m.row | 0), meta: m });
  }
  // Agent yang jalan tapi bukan crew (mis. ~/.claude/agents): kolom sendiri di kanan, "di luar flow".
  const outCol = Math.max(...tiles.map((t) => t.col)) + 1;
  let r = 0;
  for (const id of Object.keys(S.nodes || {})) if (!known.has(id)) put({ id, kind: 'agent', col: outCol, row: r++, meta: {}, extra: true });
  return tiles;
}

export function layoutEdges(S, tiles) {
  const ids = new Set(tiles.map((t) => t.id));
  const src = (S.edges && S.edges.length ? S.edges : S.crewEdges) || [];
  const edges = src.filter(([a, b]) => ids.has(a) && ids.has(b));
  const hasIn = new Set(edges.map((e) => e[1]));
  const flow = S.expected && S.expected.length ? new Set(S.expected) : null;
  const out = [[PROMPT, MAIN]];
  for (const t of tiles) if (t.kind === 'agent' && !t.extra && !hasIn.has(t.id) && (!flow || flow.has(t.id))) out.push([MAIN, t.id]);
  return out.concat(edges);
}

export function extent(tiles, d) {
  const cols = Math.max(...tiles.map((t) => t.col)) + 1, rows = Math.max(...tiles.map((t) => t.row)) + 1;
  return { w: cols * d.w + (cols - 1) * d.gx, h: rows * d.h + (rows - 1) * d.gy };
}

// Penuh (skala 1, teks 12-13 px) bila muat di panggung; kalau tidak ringkas (teks 14 px) dengan skala >= MIN_COMPACT.
export function pickView(tiles, stage, dim = DIM) {
  const f = extent(tiles, dim.full);
  if (stage.w >= f.w && stage.h >= f.h) return { mode: 'full', scale: 1, ...f };
  const c = extent(tiles, dim.compact);
  return { mode: 'compact', scale: Math.min(1, Math.max(MIN_COMPACT, Math.min(stage.w / c.w, stage.h / c.h))), ...c };
}

// Zoom manual (label relatif ke kartu penuh, DESIGN 4): >= 100% node penuh, di bawahnya ringkas. Batas bawah = batas Pas layar (74%).
export const ZMAX = 2;
export const zoomRatio = (tiles, dim = DIM) => extent(tiles, dim.compact).w / extent(tiles, dim.full).w;
export const zoomBounds = (tiles, dim = DIM) => [MIN_COMPACT * zoomRatio(tiles, dim), ZMAX];
export const zoomOf = (view, ratio) => (view.mode === 'full' ? view.scale : view.scale * ratio);
export function viewAt(tiles, z, dim = DIM) {
  const [lo, hi] = zoomBounds(tiles, dim), zz = Math.min(hi, Math.max(lo, z));
  if (zz >= 1) return { mode: 'full', scale: zz, ...extent(tiles, dim.full) };
  return { mode: 'compact', scale: zz / zoomRatio(tiles, dim), ...extent(tiles, dim.compact) };
}

// Kurva halus kolom ke kolom; node bertumpuk (kolom sama) disambung garis lurus vertikal.
export function edgePath(a, b, d) {
  const ax = a.col * (d.w + d.gx), ay = a.row * (d.h + d.gy), bx = b.col * (d.w + d.gx), by = b.row * (d.h + d.gy);
  if (a.col === b.col) {
    const x = ax + d.w / 2, down = by > ay;
    return `M${x} ${down ? ay + d.h : ay}L${x} ${down ? by : by + d.h}`;
  }
  const fwd = b.col > a.col, x1 = fwd ? ax + d.w : ax, x2 = fwd ? bx : bx + d.w, y1 = ay + d.h / 2, y2 = by + d.h / 2, k = (x2 - x1) / 2;
  return `M${x1} ${y1}C${x1 + k} ${y1} ${x2 - k} ${y2} ${x2} ${y2}`;
}

// ---------- Status dan isi node ----------
export function agentStatus(S, id) {
  const n = (S.nodes || {})[id];
  if (!n) return 'waiting';
  if (n.status === 'failed' || n.status === 'error' || n.failReason) return 'failed';
  if (asks(S).some((a) => a.agent === id)) return 'input';
  if (n.status === 'skipped' || (S.finished && (S.expected || []).includes(id) && !n.count)) return 'skipped';
  return statusKey(n.status);
}
export function mainStatus(S) {
  if (asks(S).some((a) => !a.agent || a.agent === MAIN)) return 'input';
  if (S.finished) return 'done';
  if ((S.main || {}).status === 'running' || Object.values(S.nodes || {}).some((n) => n.status === 'running')) return 'running';
  return isEmptyRun(S) ? 'waiting' : 'done'; // UX 6.1: Menunggu hanya sebelum prompt pertama
}

// Durasi pendek untuk node (lebar 208 px): detik < 1 mnt, menit < 1 jam, selebihnya jam + menit.
export const shortDur = (ms) => { const s = Math.round(ms / 1000), m = Math.floor(s / 60); return s < 60 ? `${s} dtk` : m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} jam ${m % 60} mnt`; };
const shortModel = (m) => String(m || '').replace(/^claude-/, '');
const firstLine = (s, max = 140) => String(s || '').split('\n').find((l) => l.trim()).slice(0, max);

// View-model satu node: objek polos; JSON-nya = tanda tangan (tidak ada yang tampil tanpa lewat sini).
export function nodeVm(S, t, now) {
  if (t.kind === 'prompt') {
    return { id: t.id, label: 'Prompt kamu', k: S.prompt ? 'done' : 'waiting', icon: ICON_PROMPT, meta: S.promptAt ? [fmtClock(S.promptAt)] : [], act: [S.prompt ? firstLine(S.prompt) : 'Menunggu prompt pertama'], snip: '' };
  }
  if (t.kind === 'main') {
    const k = mainStatus(S), m = S.main || {}, u = m.usage || null;
    const meta = [shortModel(m.model || (u && u.model)), u ? `${fmtTok(eqOf(u))} tok` : ''].filter(Boolean);
    const act = k === 'input' ? ['Butuh input: lihat pertanyaan di atas', 'Lihat pertanyaan di atas'] : [m.last || (k === 'waiting' ? 'Menunggu prompt pertama' : 'Sesi Claude')];
    return { id: t.id, label: 'Sesi utama', k, icon: ICON_MAIN, meta, act, snip: '' };
  }
  const n = (S.nodes || {})[t.id] || {}, k = agentStatus(S, t.id), meta = t.meta || {};
  const ms = (n.ms || 0) + (n.status === 'running' && n.startedAt ? Math.max(0, now - n.startedAt) : 0);
  const eq = eqOf(n.usage), model = shortModel((n.usage && n.usage.model) || (n.model !== 'inherit' ? n.model : ''));
  const m = [n.count > 1 ? `Putaran ${n.count}` : '', n.count > 0 && ms > 0 ? shortDur(ms) : '', eq ? `${fmtTok(eq)} tok` : '', model].filter(Boolean);
  const act = k === 'failed' ? n.failReason || n.last || 'Gagal' : n.last || n.role || meta.role || '';
  return { id: t.id, label: n.label || meta.label || t.id, k, bg: !!n.background, off: !!t.extra, icon: n.icon || meta.icon || '', meta: m, act: [act], snip: n.snippet || '', rounds: n.count || 0 };
}

// ---------- Ikon agent ----------
// Ikon dari flows.json (bukan konstanta kode) lolos raw() hanya bila murni tag grafis + atribut angka/path.
const ICON_OK = /^(?:<(?:path|circle|rect|line|polyline|ellipse)(?:\s+[a-z][a-z0-9-]*="[0-9A-Za-z .,+-]*")*\s*\/>)+$/;
const ICON_DEF = '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>';
const ICON_PROMPT = '<path d="M4 5h16v11H9l-5 4z"/>';
const ICON_MAIN = '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="m8 10 3 2-3 2M13 14h3"/>';
const svg = (inner) => html`<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(inner)}</svg>`;
export const agentIcon = (s) => svg(typeof s === 'string' && ICON_OK.test(s) ? s : ICON_DEF);

export function nodeHtml(v) {
  const aria = [v.label, statusLabel(v.k), v.rounds > 1 ? `putaran ${v.rounds}` : '', v.off ? 'di luar flow' : ''].filter(Boolean).join(', ');
  return html`<span class="port p-in"></span><span class="port p-out"></span>
<div class="n-head"><span class="chip chip-${v.k}">${agentIcon(v.icon)}</span><span class="n-name">${v.label}</span>${v.bg ? html`<span class="bg" role="img" aria-label="berjalan di background">BG</span>` : ''}<span class="st st-${v.k}">${statusIcon(v.k)}${statusLabel(v.k)}</span></div>
<div class="n-meta2">${v.meta.map((m) => html`<span>${m}</span>`)}</div>
<div class="n-act" title="${v.act[0]}"><span class="x-f">${v.act[0]}</span><span class="x-c">${v.act[1] || v.act[0]}</span></div>
<div class="n-snip">${v.snip}</div>
<button type="button" class="hit" data-id="${v.id}" aria-label="${aria}"></button>`;
}

// ---------- DOM ----------
export function initGraph() {
  const $ = (s) => document.querySelector(s);
  const scroller = $('#gscroll'), canvas = $('#canvas'), empty = $('#empty');
  if (!scroller || !canvas) return;
  const els = new Map(); // id -> { el, sig }
  let S = null, project, dim = DIM, edgeBox, pad = 16;
  let manual = null, view = null, ratio = 1, bounds = [0, 1], selId = null; // manual: null = Pas layar otomatis
  const zlbl = $('#zlbl');

  const css = (v, d) => { const x = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v)); return Number.isFinite(x) ? x : d; };
  const readDim = () => {
    dim = { full: { w: css('--node-w', DIM.full.w), h: css('--node-h', DIM.full.h), gx: css('--node-gx', DIM.full.gx), gy: css('--node-gy', DIM.full.gy) },
      compact: { w: css('--nodec-w', DIM.compact.w), h: css('--nodec-h', DIM.compact.h), gx: css('--node-gx', DIM.compact.gx), gy: css('--sp-12', DIM.compact.gy) } };
    pad = parseFloat(getComputedStyle(canvas).left) || 0;
  };

  function draw() {
    if (!S) return;
    const now = Date.now(), tiles = layoutTiles(S);
    const stage = { w: scroller.clientWidth - 2 * pad, h: scroller.clientHeight - 2 * pad };
    if (stage.w <= 0 || stage.h <= 0) return; // tersembunyi (Riwayat): ResizeObserver memanggil lagi saat tampil
    view = manual == null ? pickView(tiles, stage, dim) : viewAt(tiles, manual, dim);
    ratio = zoomRatio(tiles, dim); bounds = zoomBounds(tiles, dim);
    const d = dim[view.mode];
    if (zlbl) zlbl.textContent = Math.round(zoomOf(view, ratio) * 100) + '%';
    canvas.className = 'canvas' + (view.mode === 'compact' ? ' compact' : '');
    canvas.style.width = view.w + 'px'; canvas.style.height = view.h + 'px';
    canvas.style.transform = view.scale === 1 ? '' : `scale(${view.scale})`;
    canvas.dataset.mode = view.mode; canvas.dataset.scale = String(view.scale);
    if (!edgeBox) { edgeBox = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); edgeBox.setAttribute('class', 'edges'); edgeBox.setAttribute('aria-hidden', 'true'); canvas.prepend(edgeBox); }

    const vms = new Map();
    for (const t of tiles) {
      const v = nodeVm(S, t, now); vms.set(t.id, v);
      let e = els.get(t.id);
      if (!e) { const el = document.createElement('div'); el.dataset.id = t.id; canvas.append(el); e = { el, sig: '' }; els.set(t.id, e); }
      e.el.style.setProperty('--c', t.col); e.el.style.setProperty('--r', t.row);
      const sig = JSON.stringify(v);
      if (sig === e.sig) continue;
      e.sig = sig;
      e.el.className = `node n-${v.k}${t.id === selId ? ' sel' : ''}`;
      const hadFocus = e.el.contains(document.activeElement) && document.activeElement.classList.contains('hit');
      patch(e.el, nodeHtml(v));
      if (hadFocus) e.el.querySelector('.hit').focus({ preventScroll: true }); // patch mengganti tombol; fokus keyboard tidak boleh hilang
    }
    for (const [id, e] of els) if (!vms.has(id)) { e.el.remove(); els.delete(id); }

    const at = new Map(tiles.map((t) => [t.id, t]));
    patch(edgeBox, html`${layoutEdges(S, tiles).map(([a, b]) => {
      const k = vms.get(b).k, p = edgePath(at.get(a), at.get(b), d);
      const c = k === 'running' ? 'e e-run' : k === 'failed' ? 'e e-bad' : k === 'waiting' ? 'e e-idle' : 'e';
      return html`<path class="${c}" d="${p}"/>${k === 'running' ? html`<circle class="dot" r="5" style="offset-path:path('${p}')"/>` : ''}`;
    })}`);

    const guide = isEmptyRun(S);
    empty.hidden = !guide;
    patch(empty, guide ? GUIDE : '');
  }

  // Zoom ke z; titik (ax, ay) di viewport (pecahan isi grafik) tetap di tempatnya.
  function zoomTo(z, ax = scroller.clientWidth / 2, ay = scroller.clientHeight / 2) {
    if (!view) return;
    const fx = (scroller.scrollLeft + ax - pad) / (view.w * view.scale), fy = (scroller.scrollTop + ay - pad) / (view.h * view.scale);
    manual = Math.min(bounds[1], Math.max(bounds[0], z));
    draw();
    scroller.scrollLeft = fx * view.w * view.scale + pad - ax; scroller.scrollTop = fy * view.h * view.scale + pad - ay;
  }
  const zoomBy = (f, ax, ay) => view && zoomTo(zoomOf(view, ratio) * f, ax, ay);
  const fit = () => { manual = null; draw(); scroller.scrollLeft = 0; scroller.scrollTop = 0; };
  $('#zin')?.addEventListener('click', () => zoomBy(1.25));
  $('#zout')?.addEventListener('click', () => zoomBy(0.8));
  $('#zfit')?.addEventListener('click', fit);
  scroller.addEventListener('dblclick', (e) => { if (!e.target.closest('.node')) fit(); });
  scroller.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const r = scroller.getBoundingClientRect();
    zoomBy(Math.exp(-Math.max(-50, Math.min(50, e.deltaY)) * 0.004), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  scroller.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '+' || e.key === '=') zoomBy(1.25); else if (e.key === '-') zoomBy(0.8); else if (e.key === '0') fit();
    else if (e.key === 'Escape' && selId) setSel(null);
    else return;
    e.preventDefault();
  });

  // Pan: tarik di mana saja pada grafik; klik yang berakhir sebagai tarikan tidak memilih node.
  let drag = null, dragged = false;
  scroller.addEventListener('pointerdown', (e) => { if (e.button === 0) drag = { x: e.clientX, y: e.clientY, sl: scroller.scrollLeft, st: scroller.scrollTop, id: e.pointerId }; });
  scroller.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragged && Math.hypot(dx, dy) < 5) return;
    if (!dragged) { dragged = true; scroller.setPointerCapture(drag.id); }
    scroller.scrollLeft = drag.sl - dx; scroller.scrollTop = drag.st - dy;
  });
  const endDrag = () => { drag = null; setTimeout(() => { dragged = false; }); };
  scroller.addEventListener('pointerup', endDrag); scroller.addEventListener('pointercancel', endDrag);

  function setSel(id) {
    selId = id;
    for (const [k, e] of els) e.el.classList.toggle('sel', k === id);
  }

  document.addEventListener('fv-state', (e) => { S = e.detail; draw(); });
  document.addEventListener('fv-route', (e) => { if (e.detail.p !== project) { project = e.detail.p; S = null; manual = null; selId = null; } });
  document.addEventListener('fv-unpick', () => setSel(null));
  // Panel 900-1199 mendorong grafik: simpan zoom + posisi sebelum node dipilih, pulihkan saat panel menutup.
  let saved = null;
  document.addEventListener('fv-view-save', () => { saved = { manual, sl: scroller.scrollLeft, st: scroller.scrollTop }; });
  document.addEventListener('fv-view-restore', () => {
    if (!saved) return;
    manual = saved.manual; draw();
    scroller.scrollLeft = saved.sl; scroller.scrollTop = saved.st; saved = null;
  });
  canvas.addEventListener('click', (e) => {
    const b = e.target.closest('.hit');
    if (!b || dragged) return;
    setSel(b.dataset.id);
    document.dispatchEvent(new CustomEvent('fv-pick', { detail: { id: b.dataset.id } }));
  });
  new ResizeObserver(draw).observe(scroller);
  setInterval(() => { if (S && !document.hidden) draw(); }, 1000); // durasi node berjalan; sig mencegah tulis ulang yang tak berubah
  readDim();
}
