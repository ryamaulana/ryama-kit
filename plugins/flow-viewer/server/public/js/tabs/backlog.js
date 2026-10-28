import { html } from '../dom.js';
import { progress } from '../model.js';
import { metaOf } from '../icons.js';

const ST = { done: ['var(--ok)', 'selesai'], running: ['var(--acc)', 'berjalan'], ready: ['var(--acc)', 'siap'], waiting: ['var(--wait)', 'menunggu'], failed: ['var(--bad)', 'gagal'], parked: ['var(--wait)', 'diparkir'] };
export function badge(S) { const b = S.backlog; return { n: b && b.total ? b.total : '', warn: !!(b && b.failed) }; }
export function view(S) {
  const b = S.backlog;
  if (!b || !b.total) return { title: 'Progres & backlog', sub: 'rencana kerja proyek', body: html`<div class="sub">Belum ada <span class="mono">docs/backlog.json</span> di proyek ini. Jalankan agent Backlog untuk membuatnya.</div>` };
  const p = progress(S);
  const chips = [['ok', b.done + ' selesai'], ['acc', (b.running || 0) + ' berjalan'], ['', (b.ready || 0) + ' siap'], ['', (b.waiting || 0) + ' menunggu'], ['bad', (b.failed || 0) + ' gagal']].filter(([, t]) => !t.startsWith('0 '));
  const owner = (b.items || []).filter((i) => i.owner && i.status !== 'done');
  const rows = (b.items || []).map((i) => {
    const [c, t] = ST[i.status] || ST.waiting;
    const who = i.owner ? 'keputusan kamu' : metaOf(i.agent, S).label;
    return html`<div class="bi"><i class="dt" style="background:${c}"></i><div><b>${i.title}</b><div class="d2">${who}${i.needs && i.needs.length ? ' · menunggu: ' + i.needs.join(', ') : ''}${i.evidence ? ' · bukti: ' + i.evidence : ''}</div></div><span class="ch ${i.status === 'done' ? 'ok' : i.status === 'failed' ? 'bad' : i.owner ? 'w' : ''}">${i.owner ? 'perlu keputusan' : t}</span></div>`;
  });
  const fase = (b.fase || []).map((f) => html`<div class="row"><span>${f.nama}</span><span class="r">${f.done}/${f.total}</span></div>`);
  return { title: 'Progres & backlog', sub: b.project || '', body: html`<div class="big">${p.pct}%<span>${b.done} dari ${b.total} item selesai</span></div>
    <div class="bar2" style="height:8px;margin:8px 0 10px"><i style="width:${p.pct}%;background:var(--acc)"></i></div><div class="chs">${chips.map(([c, t]) => html`<span class="ch ${c}">${t}</span>`)}</div>
    ${owner.length ? html`<div class="box q"><small>Butuh keputusanmu</small>${owner.map((o) => html`<b>${o.title}</b>`)}</div>` : ''}
    ${fase.length ? html`<div class="hs">Per fase</div>${fase}` : ''}<div class="hs">Semua item</div>${rows}` };
}
