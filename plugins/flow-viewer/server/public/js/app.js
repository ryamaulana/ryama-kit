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
import { fmtDur, fmtClock, fmtAgo } from './format.js';
import { mdToHtml } from './md.js';

let S = { nodes: {}, crew: [], crewMeta: [], expected: [], edges: [], log: [], fileList: [], main: {} };
const ctx = { key: null, selId: null, agentTab: 'ringkasan', convo: [], detail: {}, tokOpen: new Set(), history: { rows: [], all: false, liveId: 0 }, cmp: new Set() };
const seen = new Set(); let first = true, convoN = -1, detailAt = 0, projects = null, viewing = null;

const cur = () => viewing || S;
function renderAll() {
  const V = cur();
  renderHeader(V, viewing ? (V.updatedAt || Date.now()) : Date.now()); renderGraph(V, ctx.selId); renderRail(V, ctx);
  const needs = renderPanel(V, ctx);
  if (!viewing && needs === 'convo' && V.convoN !== convoN) loadConvo();
  if (needs === 'detail') loadDetail();
  $('#pname').textContent = projectName(V);
}
async function loadConvo() { try { const d = await getJSON('/detail', { id: '__convo' }); convoN = S.convoN; ctx.convo = d.convo || []; renderAll(); } catch (_) { /* abaikan */ } }
// Detail agent dari snapshot riwayat (tanpa server). Run lama tanpa `details` jatuh ke `recent` dan fileList.
function histDetail(id) {
  const V = viewing, d = (V.details || {})[id], n = id === MAIN ? null : V.nodes[id];
  const node = n ? { ...n } : { role: 'sesi utama (orchestrator)', model: (V.main || {}).model, usage: (V.main || {}).usage, skills: V.mainSkills, status: (V.main || {}).status };
  const files = d ? d.files : (V.fileList || []).filter((f) => f.agent === id || (id === MAIN && f.agent === 'Claude'));
  const events = d ? d.events : ((n || V.main || {}).recent || []).slice().reverse().map((r) => { const [tool, ...rest] = String(r.text || '').split(' '); return { t: r.t, tool, summary: rest.join(' '), status: 'ok' }; });
  const result = d && d.result ? d.result : [...(ctx.convo || [])].reverse().find((m) => m.kind === 'agent' && m.agent === id)?.text || '';
  return { node, events, files, task: d ? d.task : '', result, usageNote: d ? '' : 'Run ini disimpan sebelum detail per agent ikut tersimpan: aktivitas hanya beberapa kejadian terakhir.' };
}
async function loadDetail(force) {
  const id = ctx.selId; if (!id) return;
  if (viewing) { if (!ctx.detail[id]) { ctx.detail[id] = histDetail(id); renderAll(); } return; }
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
  if (next.runId !== S.runId && S.runId && !viewing) { ctx.detail = {}; ctx.convo = []; convoN = -1; resetView(); seen.clear(); first = true; }
  checkAlerts(next); S = next;
  if (viewing) return;
  renderAll();
  if (ctx.key === 'agent' || ctx.selId) loadDetail();
}

// ---- Mode riwayat: run lama dimuat ke kanvas dan semua panel, hanya baca.
async function enterHist(id) {
  let r; try { r = await getJSON('/history/get', { id }); } catch (_) { return; }
  if (!r || !r.state) return;
  viewing = { ...r.state, __hist: { id: r.id, project: r.project }, convoN: (r.convo || []).length };
  ctx.convo = r.convo || []; ctx.detail = {}; ctx.selId = null; ctx.key = 'chat';
  const bar = $('#histbar'), V = viewing;
  bar.innerHTML = html`<span class="hb-t"><b>Melihat riwayat</b> · ${fmtClock(V.startedAt)} (${fmtAgo(V.startedAt)}) · ${V.title || V.flow || ''}${V.prompt ? ' · “' + String(V.prompt).slice(0, 80) + '”' : ''} · hanya baca${V.finished ? '' : ' · run tidak ditutup, status terakhir dibekukan'}</span><button class="btn" type="button" id="hsum">Ringkasan</button><button class="btn pri" type="button" id="hback">Kembali ke live</button>`.s;
  bar.hidden = false; document.body.classList.add('hist');
  $('#hsum').onclick = () => openSummary(viewing, 'Ringkasan run');
  $('#hback').onclick = exitHist;
  resetView(); renderAll(); setTimeout(refit, 230);
}
function exitHist() {
  viewing = null; ctx.detail = {}; ctx.convo = []; convoN = -1; ctx.selId = null;
  $('#histbar').hidden = true; document.body.classList.remove('hist');
  resetView(); renderAll(); setTimeout(refit, 230);
}

function openPanel(k) {
  ctx.key = ctx.key === k ? null : k;
  if (ctx.key === 'history') loadHistory();
  renderAll(); setTimeout(refit, 230);
}
function selectAgent(id) {
  ctx.selId = id; ctx.key = 'agent'; ctx.agentTab = 'ringkasan'; renderAll(); loadDetail(true);
}
const closeModal = () => { $('#modal').classList.remove('on'); $('#mc').classList.remove('wide'); renderAll(); };
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
    if (Number(b.dataset.id) === ctx.history.liveId) { if (viewing) exitHist(); return; }
    enterHist(b.dataset.id);
  });
  // Laporan token proyek (markdown yang sama dengan file .flow-viewer/laporan-token.md untuk AI).
  on($('#pi'), 'click', '[data-act=trep]', async (e, b) => {
    const project = b.dataset.project || '';
    let md = '';
    try { const r = await fetch('/report/tokens.md' + (project ? '?project=' + encodeURIComponent(project) : ''), { cache: 'no-store' }); md = await r.text(); } catch (_) { md = 'Laporan tidak tersedia.'; }
    $('#mc').classList.add('wide');
    $('#mc').innerHTML = mdToHtml(md) + '<div class="chs" style="margin-top:14px"><button class="btn pri" type="button" data-act="mclose">Tutup</button></div>';
    $('#modal').classList.add('on');
  });
  on($('#pi'), 'click', '[data-act=hscan]', async (e, b) => {
    const id = b.dataset.id; ctx.history.scan = ctx.history.scan || {};
    ctx.history.scan[id] = 'Menganalisis…'; renderAll();
    try {
      const r = await fetch('/history/rescan?id=' + id, { method: 'POST' }).then((x) => x.json());
      ctx.history.scan[id] = r.ok ? `${r.analysed}/${r.agents} agent ✓` : 'Gagal';
      if (!r.ok) console.warn('rescan', r.error);
    } catch (_) { ctx.history.scan[id] = 'Gagal'; }
    renderAll();
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
    else if (viewing) exitHist();
  });
  setInterval(() => { if (!viewing && phase(S) === 'running') { renderHeader(S); renderGraph(S, ctx.selId); } }, 1000);
  renderAll();
  connect({ onState, onStatus: (s) => setConn(s === 'open') });
}
init();
