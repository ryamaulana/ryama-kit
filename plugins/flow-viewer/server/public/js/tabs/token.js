import { html, raw } from '../dom.js';
import { fmtTok } from '../format.js';
import { tokens, agentLabel, MAIN } from '../model.js';
import { colorOf, metaOf } from '../icons.js';

export const badge = () => ({ n: '' });
const WEIGHT = [['in', 'Masuk baru', 1], ['cc', 'Cache tulis', 1.25], ['cr', 'Cache baca', 0.1], ['out', 'Keluaran', 5]];
export function ctxLimit(model) { return /1m|\[1m\]/i.test(model || '') ? 1000000 : 200000; }

export function agentBlock(r, S, open) {
  const u = r.u, parts = WEIGHT.map(([k, l, w]) => ({ k, l, v: (u[k] || 0), eq: (u[k] || 0) * w }));
  const sum = parts.reduce((a, p) => a + p.eq, 0) || 1;
  const lim = ctxLimit(u.model), ctxPct = u.ctx ? Math.min(100, Math.round((u.ctx / lim) * 100)) : 0;
  const n = r.id === MAIN ? S.main || {} : (S.nodes || {})[r.id] || {};
  const body = open ? html`<div class="ctxb"><div class="ctxh"><b>Isi konteks agent</b><span>${u.ctx ? fmtTok(u.ctx) + ' dari ' + fmtTok(lim) : 'belum terbaca'}</span></div>
    ${u.ctx ? html`<div class="bar2" style="height:9px;margin:0 0 8px"><i style="width:${ctxPct}%;background:var(--acc)"></i></div>` : ''}
    <div class="tb">${parts.map((p, i) => html`<i style="width:${Math.round((p.eq / sum) * 100)}%;background:${['var(--acc)', 'var(--warn)', 'var(--ok)', 'var(--bad)'][i]}"></i>`)}</div>
    ${parts.map((p, i) => html`<div class="crow"><i class="sq" style="background:${['var(--acc)', 'var(--warn)', 'var(--ok)', 'var(--bad)'][i]}"></i><span>${p.l}</span><b>${fmtTok(p.v)}</b><em>${Math.round((p.eq / sum) * 100)}% beban</em></div>`)}
    <div class="note">${u.turns || 0} giliran · ${n.tools || 0} tool · ${(n.files || 0)} file · ${(n.skills || []).length} skill. Rincian per kategori (prompt sistem, tool, skill, file dibaca) butuh perkiraan dari server dan belum tersedia.</div></div>` : '';
  return html`<div class="agx ${open ? 'open' : ''}" data-ag="${r.id}"><div class="agh"><i class="dt" style="background:${colorOf(r.id)}"></i><span class="chev"></span><span>${metaOf(r.id, S).label}</span><span class="r">${fmtTok(r.eq)} · ${r.pct}%</span></div>
    <div class="pb"><i style="width:${r.pct}%;background:${colorOf(r.id)}"></i></div><div class="m">${(u.model || '').replace(/^claude-/, '') || 'model ?'} · ${u.turns || 0} giliran</div>${body}</div>`;
}
export function view(S, ctx) {
  const tk = tokens(S);
  if (!tk.rows.length) return { title: 'Token', sub: 'setara input', body: html`<div class="sub">${tk.waiting ? 'Belum ada data token. Hook belum mengirim transcript agent, atau agent masih berjalan.' : 'Belum ada token terpakai.'}</div>` };
  return { title: 'Token', sub: 'setara input · perkiraan beban, bukan tagihan', body: html`<div class="big">${fmtTok(tk.eq)}<span>mentah ${fmtTok(tk.raw)}</span></div>
    <div class="tb" style="height:10px">${tk.rows.filter((r) => r.pct > 0).map((r) => html`<i style="width:${r.pct}%;background:${colorOf(r.id)}"></i>`)}</div>
    <div class="note" style="margin:0 0 6px">Setara input = masuk + 1,25 × cache tulis + 0,1 × cache baca + 5 × keluaran.</div>
    ${tk.rows.map((r) => agentBlock(r, S, ctx.tokOpen.has(r.id)))}` };
}
