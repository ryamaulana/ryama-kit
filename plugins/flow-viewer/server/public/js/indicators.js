// Pita tiga indikator (F3): Siapa kerja (#now), Progres (#prog), Token (#tok) di dalam #strip yang menempel.
// Atas: indicatorsVm (murni, diuji unit). Bawah: initIndicators (DOM, jalan pintas ke tab/node, durasi berdetak).
import { html, raw, patch } from './dom.js';
import { statusIcon, statusLabel } from './icons.js';
import { fmtDur, fmtTok } from './format.js';
import { agentStatus, mainStatus, agentIcon } from './graph.js';

const MAX_ROWS = 2;
const INPUT = new Set(['question', 'permission', 'decision']);

function whoVm(S, now) {
  const nodes = S.nodes || {}, meta = new Map((S.crewMeta || []).map((m) => [m.id, m]));
  const ids = Object.keys(nodes);
  const ask = (Array.isArray(S.attention) ? S.attention : S.pending && S.pending.text ? [S.pending] : []).some((a) => !a.kind || INPUT.has(a.kind));
  const failed = ids.filter((id) => agentStatus(S, id) === 'failed');
  const running = ids.filter((id) => agentStatus(S, id) === 'running');
  const quiet = running.filter((id) => nodes[id].quiet);

  const row = (id, kind) => {
    const n = nodes[id], m = meta.get(id) || {};
    const act = kind === 'failed' ? n.failReason || n.last || 'Gagal'
      : kind === 'quiet' ? `diam ${Math.max(10, Math.floor((now - (n.lastEventAt || n.startedAt || now)) / 60000))} mnt`
        : n.last || n.role || m.role || '';
    return { id, kind, icon: n.icon || m.icon || '', act };
  };
  const all = [...failed.map((id) => row(id, 'failed')), ...quiet.map((id) => row(id, 'quiet')), ...running.filter((id) => !nodes[id].quiet).map((id) => row(id, 'running'))];

  let title;
  if (ask) title = 'Menunggu kamu: jawab pertanyaan';
  else if (failed.length === 1) title = `Agent ${failed[0]} berhenti di putaran ${nodes[failed[0]].count || 1}.`;
  else if (failed.length > 1) title = `${failed.length} agent gagal`;
  else if (running.length) title = `${running.length} agent berjalan`;
  else title = 'Tidak ada agent yang berjalan.';
  // PRD F3: tanpa agent berjalan, status sesi utama ikut disebut.
  const sub = running.length ? '' : `Sesi utama: ${statusLabel(mainStatus(S))}`;
  return { title, sub, running: running.length, rows: all.slice(0, MAX_ROWS), more: Math.max(0, all.length - MAX_ROWS), input: ask };
}

function progVm(S, now) {
  const p = S.progress || {}, has = p.pct != null;
  const end = S.finished ? S.updatedAt || now : now;
  return {
    num: has ? `${p.pct}%` : '-', pct: has ? p.pct : null, label: has ? p.label || '' : 'Belum ada rencana',
    dur: S.startedAt ? `Durasi ${fmtDur(Math.max(0, end - S.startedAt))}` : '',
    hasBacklog: !!(S.backlog && S.backlog.total),
  };
}

function tokVm(S) {
  const t = S.tokens || {};
  if (t.eq == null) return { waiting: true, num: '', delta: null, boros: false };
  const d = t.deltaPct;
  // Tanpa pembanding (server mengirim null) tidak ada selisih dan tidak ada Boros.
  const delta = d == null ? null : { dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', text: `${d > 0 ? '+' : d < 0 ? '-' : ''}${Math.abs(d)}% dari run sebelumnya`, prev: t.prevEq ? `(${fmtTok(t.prevEq)})` : '' };
  return { waiting: false, num: fmtTok(t.eq), delta, boros: !!t.boros && !!delta };
}

export const indicatorsVm = (S, now = Date.now()) => ({ who: whoVm(S, now), prog: progVm(S, now), tok: tokVm(S) });

// ---------- DOM ----------
const ico = (d, s = 18) => html`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(d)}</svg>`;
const I_WHO = '<path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M17 14a6 6 0 0 1 4 6"/>';
const I_PROG = '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l3 3 5-6"/>';
const I_TOK = '<path d="M4 17a8 8 0 1 1 16 0M12 17l4-5"/>';
const I_UP = '<path d="M12 19V5M6 11l6-6 6 6"/>', I_DOWN = '<path d="M12 5v14M6 13l6 6 6-6"/>', I_FLAT = '<path d="M5 12h14"/>';
const I_BOROS = '<path d="M12 4 2.5 20h19zM12 10v4M12 17v.1"/>';

const whoHtml = (v) => html`<header><span class="k-chip">${ico(I_WHO)}</span><h2>Siapa kerja</h2>${v.running ? html`<span class="pill st-running">${statusIcon('running')}${v.running} berjalan</span>` : ''}</header>
  <p class="k-big">${v.title}</p>${v.sub ? html`<p class="k-sub">${v.sub}</p>` : ''}
  ${v.rows.length || v.more ? html`<ul class="who">${v.rows.map((r) => html`<li><button type="button" class="who-n" data-select="${r.id}">${agentIcon(r.icon)}${r.id}</button><span class="who-a">${r.act}</span></li>`)}${v.more ? html`<li class="more">+${v.more} lainnya</li>` : ''}</ul>` : ''}`;

const progHtml = (v) => html`<header><span class="k-chip">${ico(I_PROG)}</span><h2>Progres</h2>${v.hasBacklog ? html`<button type="button" class="lnk" data-show="backlog">Lihat backlog</button>` : ''}</header>
  <div class="k-row"><p class="k-num">${v.num}</p><div class="k-side">${v.pct == null ? '' : html`<div class="meter" role="img" aria-label="Progres ${v.pct} persen"><i style="width:${v.pct}%"></i></div>`}<p class="k-cap">${v.label}</p>${v.dur ? html`<p class="k-cap">${v.dur}</p>` : ''}</div></div>`;

const tokHtml = (v) => html`<header><span class="k-chip">${ico(I_TOK)}</span><h2>Token</h2><button type="button" class="lnk" data-show="token">Lihat token</button></header>
  ${v.waiting ? html`<p class="k-sub">menunggu data</p>` : html`<div class="k-row"><div><p class="k-num">${v.num}</p><p class="k-cap">setara input${v.boros ? html` <span class="pill st-input">${ico(I_BOROS, 14)}Boros</span>` : ''}</p></div></div>
  ${v.delta ? html`<p class="delta">${ico(v.delta.dir === 'up' ? I_UP : v.delta.dir === 'down' ? I_DOWN : I_FLAT, 14)}${v.delta.text} ${v.delta.prev ? html`<span>${v.delta.prev}</span>` : ''}</p>` : ''}`}`;

export function initIndicators() {
  const $ = (s) => document.querySelector(s);
  const now = $('#now'), prog = $('#prog'), tok = $('#tok'), strip = $('#strip');
  if (!now || !prog || !tok) return;
  let S = null;

  function draw() {
    if (!S) {
      patch(now, html`<header><span class="k-chip">${ico(I_WHO)}</span><h2>Siapa kerja</h2></header><p class="k-sub" role="status">Memuat data...</p>`);
      patch(prog, progHtml(progVm({}, Date.now())));
      patch(tok, tokHtml({ waiting: true }));
      return;
    }
    const v = indicatorsVm(S, Date.now());
    patch(now, whoHtml(v.who)); patch(prog, progHtml(v.prog)); patch(tok, tokHtml(v.tok));
  }

  document.addEventListener('fv-state', (e) => { S = e.detail; draw(); });
  document.addEventListener('fv-route', (e) => { if (e.detail.p) { S = null; draw(); } });
  setInterval(() => { if (S && !S.finished && !document.hidden) draw(); }, 1000); // durasi dan "diam N mnt"; patch() menolak tulis ulang yang tak berubah

  // Jalan pintas: tab rel lewat tombolnya (panel.js memegang logikanya), agent lewat klik node (grafik menyorotnya dan memicu fv-pick).
  strip.addEventListener('click', (e) => {
    const sh = e.target.closest('[data-show]'), sel = e.target.closest('[data-select]');
    if (sh) $(`#rail button[data-v="${sh.dataset.show}"]`)?.click();
    else if (sel) $(`#canvas .node[data-id="${CSS.escape(sel.dataset.select)}"] .hit`)?.click();
  });
  draw();
}
