// Kotak pemberitahuan (F5): Butuh input (pertanyaan, izin, keputusan backlog) dan Gagal, di bawah pita.
// Atas: alertsVm (murni, diuji unit). Bawah: initAlerts (DOM). Item datang dari S.attention; hilangnya item = sudah terjawab.
import { html, patch } from './dom.js';
import { statusIcon } from './icons.js';
import { fmtClock } from './format.js';
import { MAIN } from './graph.js';

const MAX_OPEN = 2; // PRD F5 / DESIGN 4: maks 2 item terbuka per jenis, sisanya "+N lainnya"
const INPUT = new Set(['question', 'permission', 'decision']);

// Teks keputusan backlog -> { q, options, rec }. Server tidak mengirim pilihan untuk keputusan (options: []),
// jadi dibaca dari teksnya: "... Pilih: (a) x; (b) y (rekomendasi: z)". Tanpa "Pilih:" hanya rekomendasi yang diambil.
// shortcut: hanya format "(a) ...; (b) ..." yang dikenali, tambah bila server mengirim pilihan terstruktur.
export function splitDecision(text) {
  let t = String(text || '').trim(), rec = '';
  const m = t.match(/\s*\(rekomendasi:\s*(.*)\)\s*$/i);
  if (m) { rec = m[1].trim(); t = t.slice(0, m.index).trim(); }
  const at = t.search(/\bPilih:\s*\(/i);
  if (at < 0) return { q: t, options: [], rec };
  const options = [...t.slice(at).matchAll(/\(([a-z0-9])\)\s*(.*?)(?=\s*;?\s*\([a-z0-9]\)\s|$)/gi)].map((o) => o[2].replace(/[;.\s]+$/, '')).filter(Boolean);
  return { q: t.slice(0, at).trim(), options, rec };
}

const optLabel = (o) => (typeof o === 'string' ? o : o && o.label) || '';
const whoOf = (S, a) => (!a.agent || a.agent === MAIN || a.agent === 'main' ? 'Claude' : a.agent === 'backlog' ? 'Backlog' : ((S.crewMeta || []).find((m) => m.id === a.agent) || {}).label || a.agent);
const clock = (at) => (at ? fmtClock(at).slice(0, 5) : '');

function itemVm(S, a) {
  const base = { key: a.key, kind: a.kind, agent: a.agent || '', who: whoOf(S, a), time: clock(a.at) };
  if (a.kind === 'decision') {
    const d = splitDecision(a.text), own = (a.options || []).map(optLabel).filter(Boolean);
    return { ...base, title: d.q, options: own.length ? own : d.options, ctx: `Item backlog menunggu keputusanmu.${d.rec ? ` Rekomendasi: ${d.rec}.` : ''}` };
  }
  if (a.kind === 'failed') return { ...base, title: a.text || 'Agent gagal', options: [], node: !!(S.nodes || {})[a.agent] };
  return {
    ...base, title: a.text || 'Claude bertanya', options: (a.options || []).map(optLabel).filter(Boolean),
    ctx: a.kind === 'permission' ? 'Claude minta izin memakai alat dan menunggu keputusanmu.' : 'Claude menunggu jawabanmu sebelum melanjutkan.',
  };
}

const cut = (list) => ({ total: list.length, open: list.slice(0, MAX_OPEN), more: Math.max(0, list.length - MAX_OPEN) });

export function alertsVm(S) {
  const seen = new Set(); // kunci yang sama tidak pernah jadi dua kotak
  const items = (Array.isArray((S || {}).attention) ? S.attention : []).filter((a) => a && a.key && !seen.has(a.key) && seen.add(a.key)).sort((a, b) => (b.at || 0) - (a.at || 0));
  const input = cut(items.filter((a) => INPUT.has(a.kind)).map((a) => itemVm(S, a)));
  const failed = cut(items.filter((a) => a.kind === 'failed').map((a) => itemVm(S, a)));
  return { input, failed, any: input.total + failed.total > 0 };
}

// ---------- DOM ----------
const choices = (o, cls = '') => (o.length ? html`<ol class="choices ${cls}">${o.map((x) => html`<li>${x}</li>`)}</ol>` : '');

const failCard = (f) => html`<article class="n-f" role="group" aria-label="Gagal: ${f.who}">
  <header>${statusIcon('failed')}<h3>Gagal · ${f.who}${f.time ? ` · ${f.time}` : ''}</h3></header>
  <p class="n-t">${f.title}</p>
  ${f.node ? html`<button type="button" class="lnk" data-select="${f.agent}">Lihat detail</button>` : f.agent === 'backlog' ? html`<button type="button" class="lnk" data-show="backlog">Lihat detail</button>` : ''}
</article>`;

const failCol = (v, cls = '') => html`<div class="n-fs ${cls}">${v.open.map(failCard)}${v.more ? html`<p class="more">+${v.more} lainnya</p>` : ''}</div>`;

function box(v) {
  const [q, second] = v.input.open;
  return html`<div class="notice" role="group" aria-label="Butuh input">
  <div class="n-top">${statusIcon('input')}<h2>Butuh input (${v.input.total})</h2>
    <div class="n-act2"><span class="n-hint">Jawab di aplikasi Claude.</span><button type="button" class="lnk" data-show="chat">Lihat percakapan</button></div></div>
  <div class="n-q"><p class="n-meta">${q.who}${q.time ? ` · ${q.time}` : ''}</p><p class="n-title">${q.title}</p><p class="n-ctx">${q.ctx}</p>${choices(q.options)}</div>
  ${v.failed.total ? failCol(v.failed) : ''}
  ${second ? html`<div class="n-sub"><span class="n-meta">${second.who}${second.time ? ` · ${second.time}` : ''}</span><b>${second.title}</b><span class="n-ctx">${second.ctx}</span>${choices(second.options, 'n-sub-ch')}</div>` : ''}
  ${v.input.more ? html`<p class="more n-more">+${v.input.more} lainnya</p>` : ''}
</div>`;
}

export const alertsHtml = (v) => (v.input.total ? box(v) : v.failed.total ? failCol(v.failed, 'solo') : '');

export function initAlerts() {
  const el = document.querySelector('#alerts');
  if (!el) return;
  const draw = (S) => {
    const v = S ? alertsVm(S) : null;
    el.hidden = !v || !v.any;
    document.body.classList.toggle('has-notice', !el.hidden); // DESIGN masalah #2: angka KPI mengalah selama kotak terbuka
    patch(el, v ? alertsHtml(v) : '');
  };
  document.addEventListener('fv-state', (e) => draw(e.detail));
  document.addEventListener('fv-route', (e) => { if (e.detail.p) draw(null); });
  // Jalan pintas seperti pita: tab rel lewat tombolnya, node lewat klik node (grafik menyorotnya dan memicu fv-pick).
  el.addEventListener('click', (e) => {
    const sh = e.target.closest('[data-show]'), sel = e.target.closest('[data-select]');
    if (sh) document.querySelector(`#rail button[data-v="${sh.dataset.show}"]`)?.click();
    else if (sel) document.querySelector(`#canvas .node[data-id="${CSS.escape(sel.dataset.select)}"] .hit`)?.click();
  });
}
