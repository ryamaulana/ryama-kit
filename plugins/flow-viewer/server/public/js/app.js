// Titik masuk: menyambung data, menjaga state tampilan, dan merender ulang bagian yang berubah.
import { $, $$, html, raw, patch, on } from './dom.js';
import { connect, getJSON, post } from './api.js';
import { renderGraph, initGraph, refit, resetView } from './graph.js';
import { renderHeader, setConn } from './header.js';
import { renderRail, renderPanel } from './panel.js';
import { summaryHtml } from './summary.js';
import { initTheme } from './theme.js';
import { prefs, alertNew, askDesktop, clearTitle } from './notify.js';
import { loadProjects, projectName } from './projects.js';
import { attentionItems, needsInput, agentLabel, phase, MAIN } from './model.js';
import { fmtDur } from './format.js';

let S = { nodes: {}, crew: [], crewMeta: [], expected: [], edges: [], log: [], fileList: [], main: {} };
const ctx = { key: null, selId: null, agentTab: 'ringkasan', convo: [], detail: {}, tokOpen: new Set(), history: { rows: [], all: false, liveId: 0 }, cmp: new Set() };
const seen = new Set(); let first = true, convoN = -1, detailAt = 0, projects = null, viewing = null;

const cur = () => viewing || S;
function renderAll() {
  const V = cur();
  renderHeader(V); renderGraph(V, ctx.selId); renderRail(V, ctx);
  const needs = renderPanel(V, ctx);
  if (needs === 'convo' && V.convoN !== convoN) loadConvo();
  if (needs === 'detail') loadDetail();
  $('#pname').textContent = projectName(V);
}
async function loadConvo() { try { const d = await getJSON('/detail', { id: '__convo' }); convoN = S.convoN; ctx.convo = d.convo || []; renderAll(); } catch (_) { /* abaikan */ } }
async function loadDetail(force) {
  const id = ctx.selId; if (!id) return;
  if (!force && ctx.detail[id] && Date.now() - detailAt < 1500) return;
  detailAt = Date.now();
  try { ctx.detail[id] = await getJSON('/detail', { id }); renderAll(); } catch (_) { ctx.detail[id] = { node: {}, events: [], files: [], usageNote: 'Detail tidak tersedia.' }; renderAll(); }
}
async function loadHistory() {
  try { const d = await getJSON('/history', ctx.history.all ? { all: 1 } : {}); ctx.history = { ...ctx.history, rows: d.rows || [], liveId: d.liveId, err: false }; } catch (_) { ctx.history.err = true; }
  renderAll();
}

function checkAlerts(next) {
  const items = attentionItems(next).filter((a) => a.kind !== 'done' || next.finished);
  if (first) { items.forEach((a) => seen.add(a.key)); first = false; return; }
  for (const a of items) if (!seen.has(a.key)) { seen.add(a.key); alertNew(a, a.agent ? agentLabel(a.agent, next) : ''); }
}

function onState(next) {
  if (next.runId !== S.runId && S.runId) { ctx.detail = {}; ctx.convo = []; convoN = -1; resetView(); seen.clear(); first = true; }
  checkAlerts(next); S = next;
  if (!viewing) renderAll();
  if (ctx.key === 'agent' || ctx.selId) loadDetail();
}

function openPanel(k) {
  ctx.key = ctx.key === k ? null : k;
  if (ctx.key === 'history') loadHistory();
  renderAll(); setTimeout(refit, 230);
}
function selectAgent(id) {
  ctx.selId = id; ctx.key = 'agent'; ctx.agentTab = 'ringkasan'; renderAll(); loadDetail(true);
}
const closeModal = () => { $('#modal').classList.remove('on'); viewing = null; renderAll(); };
function openSummary(state, title) { $('#mc').innerHTML = summaryHtml(state, title).s; $('#modal').classList.add('on'); }
function flash(sel) { const el = $(sel); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

// ---- Pengaturan
let resetArm = 0;
function settingsHtml() {
  const sw = (on) => `<span class="sw${on ? ' on' : ''}"></span>`;
  return `<div class="hd">Pemberitahuan</div><div class="it" data-a="snd"><span>Bunyi saat butuh jawaban</span>${sw(prefs.sound())}</div><div class="it" data-a="dsk"><span>Notifikasi desktop</span>${sw(prefs.desktop())}</div><hr><div class="hd">Run</div><div class="it" id="reset" data-a="rst"><span>${resetArm ? 'Yakin? Klik lagi untuk mereset' : 'Reset tampilan run ini'}</span></div>`;
}
function showMenu() {
  const m = $('#pmenu'), b = $('#more').getBoundingClientRect();
  m.innerHTML = settingsHtml(); m.hidden = false; m.style.top = b.bottom + 8 + 'px'; m.style.right = Math.max(8, innerWidth - b.right) + 'px'; m.style.left = 'auto';
}
const hideMenu = () => { $('#pmenu').hidden = true; resetArm = 0; $('#pop').classList.remove('on'); };

function init() {
  initTheme();
  initGraph({ onSelect: selectAgent, onOpenMain: () => selectAgent(MAIN) });
  on($('#rail'), 'click', 'button[data-v]', (e, b) => openPanel(b.dataset.v));
  on($('#pi'), 'click', '[data-act=pclose]', () => openPanel(ctx.key));
  on($('#pi'), 'click', '[data-tab]', (e, b) => { ctx.agentTab = b.dataset.tab; renderAll(); });
  on($('#pi'), 'click', '[data-ag]', (e, el) => { if (!e.target.closest('.agh')) return; const id = el.dataset.ag; ctx.tokOpen.has(id) ? ctx.tokOpen.delete(id) : ctx.tokOpen.add(id); renderAll(); });
  on($('#pi'), 'change', '[data-cmp]', (e, el) => { const id = Number(el.dataset.cmp); if (el.checked) { if (ctx.cmp.size >= 2) ctx.cmp.delete(ctx.cmp.values().next().value); ctx.cmp.add(id); } else ctx.cmp.delete(id); renderAll(); });
  on($('#pi'), 'click', '[data-act=hall]', () => { ctx.history.all = !ctx.history.all; loadHistory(); });
  on($('#pi'), 'click', '[data-act=hopen]', async (e, b) => {
    try { const r = await getJSON('/history/get', { id: b.dataset.id }); viewing = null; openSummary(r.state, 'Ringkasan run'); } catch (_) { /* abaikan */ }
  });
  on($('#mc'), 'click', '[data-act=mclose]', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('#tkov').onclick = () => { ctx.key = 'token'; renderAll(); };
  $('#hb-run').onclick = () => { const r = Object.keys(S.nodes).find((id) => S.nodes[id].status === 'running'); if (r) selectAgent(r); };
  $('#need').onclick = () => {
    const k = $('#need').dataset.kind;
    if (k === 'input') { ctx.key = 'chat'; renderAll(); flash('#pi .box.q'); }
    else if (k === 'failed') { const f = attentionItems(S).find((a) => a.kind === 'failed'); if (f) selectAgent(f.agent); }
    else if (k === 'done') openSummary(S);
  };
  $('#more').onclick = (e) => { e.stopPropagation(); $('#pmenu').hidden ? showMenu() : hideMenu(); };
  on($('#pmenu'), 'click', '[data-a]', async (e, it) => {
    const a = it.dataset.a;
    if (a === 'snd') prefs.setSound(!prefs.sound());
    else if (a === 'dsk') { if (!prefs.desktop()) { if (await askDesktop()) prefs.setDesktop(true); } else prefs.setDesktop(false); }
    else if (a === 'rst') {
      if (!resetArm) { resetArm = setTimeout(() => { resetArm = 0; if (!$('#pmenu').hidden) showMenu(); }, 4000); }
      else { clearTimeout(resetArm); resetArm = 0; try { await post('/reset'); } catch (_) { /* abaikan */ } hideMenu(); return; }
    }
    showMenu();
  });
  $('#proj').onclick = async (e) => {
    e.stopPropagation();
    if (projects === null) projects = await loadProjects();
    const pop = $('#pop'), b = $('#proj').getBoundingClientRect();
    const list = projects || [];
    pop.innerHTML = list.length ? `<div class="hd">Proyek</div>` + list.map((p) => html`<div class="it" data-p="${p.id}"><span>${p.name}</span><small>${p.state || ''}</small></div>`.s).join('') : `<div class="hd">Proyek</div><div class="it"><span>${projectName(S)}</span><small>aktif</small></div><div class="it"><small>Banyak proyek butuh server yang lebih baru.</small></div>`;
    pop.style.top = b.bottom + 8 + 'px'; pop.style.left = b.left + 'px'; pop.classList.toggle('on');
  };
  on($('#pop'), 'click', '[data-p]', (e, it) => { const u = new URL(location.href); u.searchParams.set('p', it.dataset.p); location.href = u.toString(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#pmenu,#more,#pop,#proj')) hideMenu(); });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#modal').classList.contains('on')) closeModal();
    else if (!$('#pmenu').hidden || $('#pop').classList.contains('on')) hideMenu();
    else if (ctx.key) openPanel(ctx.key);
  });
  setInterval(() => { if (!viewing && phase(S) === 'running') { renderHeader(S); renderGraph(S, ctx.selId); } }, 1000);
  renderAll();
  connect({ onState, onStatus: (s) => setConn(s === 'open') });
}
init();
