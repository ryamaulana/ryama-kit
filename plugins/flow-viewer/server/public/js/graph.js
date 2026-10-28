// Kanvas alur: simpul ikon-tile, garis lengkung, kartu sesi utama, zoom dan geser.
import { html, raw, patch, $ } from './dom.js';
import { fmtDur, fmtTok, eqOf } from './format.js';
import { STATUS_TEXT, STATUS_ICON, colorOf, metaOf, ICONS, RAIL_ICON } from './icons.js';
import { layout, nodeStatus, mainStatus, attentionItems, mainCard, MAIN, PROMPT, agentLabel } from './model.js';

const CW = 210, GX = 96, GY = 24, NH = 176, TS = 88, TOP = 34;
const COLS = ['Input', 'Spesifikasi', 'Bangun', 'Verifikasi', 'Lainnya'];
const svg = (p, sw = 1.5) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

const view = { z: 1, x: 0, y: 0, w: 0, h: 0, touched: false };
let lastSig = '';

function nodeHtml(t, S, items, selId) {
  const id = t.id;
  const st = id === MAIN ? mainStatus(S, items) : id === PROMPT ? (S.prompt ? 'done' : 'idle') : nodeStatus(S, id, items);
  const n = id === MAIN ? (S.main || {}) : id === PROMPT ? {} : (S.nodes || {})[id] || {};
  const m = metaOf(id, S);
  const usage = n.usage;
  let act = '';
  if (id === PROMPT) act = S.prompt || '';
  else if (st === 'input') act = (items.find((a) => (a.agent === id || (id === MAIN && !a.agent)) && a.text) || {}).text || '';
  else act = n.last || (st === 'idle' ? '' : '');
  const time = n.ms ? fmtDur(n.ms) : (st === 'running' && n.startedAt ? fmtDur(Date.now() - n.startedAt) : '');
  const rounds = n.count > 1 ? ` · ${n.count} putaran` : '';
  const sTxt = id === PROMPT ? (S.prompt ? 'masuk' : 'belum ada') : STATUS_TEXT[st];
  const model = (n.model || (usage && usage.model) || '').replace(/^claude-/, '');
  const chips = html`${model ? html`<span class="ch m">${model}</span>` : ''}${usage ? html`<span class="ch">${fmtTok(eqOf(usage))} token</span>` : ''}`;
  const off = st === 'idle' && S.expected && S.expected.length && !S.expected.includes(id) && id !== MAIN && id !== PROMPT ? ' off' : '';
  const icon = ICONS[id] || ICONS._def;
  return html`<div class="node ${st} st-${st}${off}${id === selId ? ' sel' : ''}" data-id="${id}" data-st="${st}" style="left:${t.px}px;top:${t.py}px;width:${CW}px" tabindex="0" role="button" aria-label="${m.label}, ${sTxt}">
  <div class="tile" style="--rc:${colorOf(id)}">${raw(svg(icon))}<b class="sb">${raw(STATUS_ICON[st] ? svg(STATUS_ICON[st], 3) : '')}</b>${t.hasIn ? raw('<i class="port l"></i>') : ''}${t.hasOut ? raw('<i class="port r"></i>') : ''}</div>
  <div class="lb"><div class="n">${m.label}</div><div class="s ${st}">${sTxt}${time ? ' · ' + time : ''}${rounds}</div>${act ? html`<div class="a mono">${act}</div>` : ''}${model || usage ? html`<div class="cp">${chips}</div>` : ''}</div></div>`.s;
}

function mainCardHtml(S, t) {
  const c = mainCard(S);
  const ctxPct = c.ctx ? Math.min(100, Math.round((c.ctx / 200000) * 100)) : 0;
  const tools = (S.main || {}).tools || 0;
  const sk = c.skills.length;
  const chipRow = (icon, title, sub, extra = '') => html`<div class="smr"><span class="oc">${raw(svg(icon, 1.6))}</span><div><b>${title}</b><small>${sub}</small>${raw(extra)}</div></div>`.s;
  return `<div class="sm" data-id="${MAIN}" data-open="agent" style="left:${t.px}px;top:${t.py + NH + 8}px;width:${CW}px"><div class="smh">Sesi utama · Claude</div>`
    + chipRow(RAIL_ICON.model, c.model ? c.model.replace(/^claude-/, '') : 'model belum terbaca', c.turns != null ? `giliran ${c.turns}${c.ctx ? ` · konteks ${ctxPct}%` : ''}` : 'menunggu data', c.ctx ? `<div class="mb"><i style="width:${ctxPct}%"></i></div>` : '')
    + chipRow(RAIL_ICON.skill, `${sk} skill dipanggil`, sk ? c.skills.join(', ') : 'belum ada yang dipanggil')
    + chipRow(RAIL_ICON.tool, `${tools} tool dipakai`, c.lastTool ? 'terakhir: ' + c.lastTool : 'belum ada')
    + '</div>';
}

function edgesSvg(tiles, edges, S, items) {
  const by = Object.fromEntries(tiles.map((t) => [t.id, t]));
  const stOf = (id) => (id === MAIN ? mainStatus(S, items) : id === PROMPT ? (S.prompt ? 'done' : 'idle') : nodeStatus(S, id, items));
  let d = '<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,1 L9,5 L0,9z" style="fill:var(--edge)"/></marker><marker id="arA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,1 L9,5 L0,9z" style="fill:var(--acc)"/></marker></defs>';
  for (const [f, t] of edges) {
    const F = by[f], T = by[t]; if (!F || !T) continue;
    const live = stOf(t) === 'running' && ['done', 'running', 'input'].includes(stOf(f));
    const faint = stOf(t) === 'idle' && stOf(f) === 'idle';
    let path;
    if (F.col === T.col) {
      const vx = F.px + CW / 2;
      path = `M${vx},${F.py + NH - 4} L${vx},${T.py - 6}`;
    } else {
      const x1 = F.px + (CW + TS) / 2 + 6, y1 = F.py + TS / 2, x2 = T.px + (CW - TS) / 2 - 7, y2 = T.py + TS / 2, mx = (x1 + x2) / 2;
      path = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    }
    d += `<path class="edge${faint ? ' faint' : ''}${live ? ' live' : ''}" d="${path}" fill="none" stroke="var(--edge)" stroke-width="1.7" ${faint ? 'opacity=".55" ' : ''}marker-end="url(#${live ? 'arA' : 'ar'})"/>`;
  }
  return d;
}

export function renderGraph(S, selId) {
  const items = attentionItems(S);
  const { tiles, edges } = layout(S);
  const hasIn = new Set(edges.map((e) => e[1])), hasOut = new Set(edges.map((e) => e[0]));
  for (const t of tiles) { t.px = t.col * (CW + GX); t.py = TOP + t.row * (NH + GY); t.hasIn = hasIn.has(t.id); t.hasOut = hasOut.has(t.id); }
  const maxCol = Math.max(...tiles.map((t) => t.col)), maxRow = Math.max(...tiles.map((t) => t.row));
  const W = (maxCol + 1) * CW + maxCol * GX, H = TOP + (maxRow + 1) * (NH + GY) + 20;
  const mainTile = tiles.find((t) => t.id === MAIN);
  const used = new Set(tiles.map((t) => t.col));
  let h = '<svg id="ed" width="' + W + '" height="' + H + '">' + edgesSvg(tiles, edges, S, items) + '</svg>';
  for (const c of used) h += `<div class="col" style="left:${c * (CW + GX)}px;width:${CW}px"><h4>${COLS[Math.min(c, 4)]}</h4></div>`;
  for (const t of tiles) h += nodeHtml(t, S, items, selId);
  h += mainCardHtml(S, mainTile);
  const cv = $('#cv');
  const sig = h + selId;
  if (sig !== lastSig) { lastSig = sig; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.innerHTML = h; }
  view.w = W; view.h = H;
  $('#empty').hidden = !!(S.prompt || Object.values(S.nodes || {}).some((n) => n.count > 0 || n.status !== 'idle'));
  if (!view.touched) fit();
}

function apply() { $('#cv').style.transform = `translate(${view.x}px,${view.y}px) scale(${view.z})`; const l = $('#zlbl'); if (l) l.textContent = Math.round(view.z * 100) + '%'; }
export function fit() {
  const st = $('#stage'); if (!st || !view.w) return;
  const w = st.clientWidth - 48, h = st.clientHeight - 130;
  view.z = Math.max(0.75, Math.min(1, w / view.w, h / view.h));
  view.x = view.w * view.z <= st.clientWidth - 24 ? (st.clientWidth - view.w * view.z) / 2 : 24;
  view.y = view.h * view.z <= h ? 56 + (h - view.h * view.z) / 2 + 10 : 60;
  view.touched = false; apply();
}
const zoomBy = (f, cx, cy) => {
  const nz = Math.max(0.4, Math.min(1.6, view.z * f)), k = nz / view.z;
  const st = $('#stage').getBoundingClientRect();
  cx = (cx ?? st.width / 2); cy = (cy ?? st.height / 2);
  view.x = cx - (cx - view.x) * k; view.y = cy - (cy - view.y) * k; view.z = nz; view.touched = true; apply();
};

export function initGraph({ onSelect, onOpenMain }) {
  const st = $('#stage');
  $('#zin').onclick = () => zoomBy(1.15);
  $('#zout').onclick = () => zoomBy(1 / 1.15);
  $('#zfit').onclick = fit;
  st.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = st.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    else { view.x -= e.deltaX; view.y -= e.deltaY; view.touched = true; apply(); }
  }, { passive: false });
  let drag = null, moved = false;
  st.addEventListener('pointerdown', (e) => { if (e.target.closest('.zoom,.legend')) return; drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; moved = false; });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true; st.classList.add('drag'); view.x = drag.vx + dx; view.y = drag.vy + dy; view.touched = true; apply();
  });
  addEventListener('pointerup', () => { drag = null; st.classList.remove('drag'); });
  st.addEventListener('click', (e) => {
    if (moved) { moved = false; return; }
    const n = e.target.closest('.node'); const sm = e.target.closest('.sm');
    if (n) onSelect(n.dataset.id); else if (sm) onOpenMain();
  });
  st.addEventListener('keydown', (e) => { const n = e.target.closest('.node'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(n.dataset.id); } });
  addEventListener('resize', () => { if (!view.touched) fit(); });
}
export const refit = () => { if (!view.touched) fit(); };
export const resetView = () => { view.touched = false; lastSig = ''; };
