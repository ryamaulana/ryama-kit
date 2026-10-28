// Riwayat run: daftar, bandingkan dua run, buka ringkasan, hapus.
import { html } from './dom.js';
import { fmtTok, fmtDur, fmtClock, fmtAgo } from './format.js';

export const badge = (ctx) => ({ n: (ctx.history.rows || []).length || '' });
export function view(S, ctx) {
  const h = ctx.history, rows = h.rows || [], cmp = ctx.cmp;
  if (h.err) return { title: 'Riwayat run', sub: '', body: html`<div class="sub">Riwayat belum tersedia di server ini.</div>`, needs: 'history' };
  const sel = rows.filter((r) => cmp.has(r.id));
  let compare = '';
  if (sel.length === 2) {
    const [a, b] = sel.sort((x, y) => x.started_at - y.started_at);
    const dl = (x, y) => (x && y ? Math.round(((y - x) / x) * 100) : null);
    const line = (k, f, xa, xb) => html`<div class="kv"><span>${k}</span><b>${f(xa)} → ${f(xb)}${dl(xa, xb) != null ? ` (${dl(xa, xb) > 0 ? '+' : ''}${dl(xa, xb)}%)` : ''}</b></div>`;
    compare = html`<div class="box"><small>Perbandingan</small>${line('Token setara', fmtTok, a.tokens_eq, b.tokens_eq)}${line('Durasi', fmtDur, a.updated_at - a.started_at, b.updated_at - b.started_at)}${line('Agent jalan', String, a.agents_ran, b.agents_ran)}${line('File diubah', String, a.files, b.files)}</div>`;
  }
  return { title: 'Riwayat run', sub: `${rows.length} run${h.all ? ' · semua proyek' : ' · proyek ini'}`, needs: 'history', body: html`
    <div class="chs"><button class="btn" type="button" data-act="hall">${h.all ? 'Hanya proyek ini' : 'Semua proyek'}</button></div>${compare}
    ${rows.length ? rows.map((r) => html`<div class="ck" data-run="${r.id}"><input type="checkbox" data-cmp="${r.id}" ${cmp.has(r.id) ? 'checked' : ''} aria-label="Bandingkan"><div style="min-width:0;flex:1"><b>${r.title || r.prompt || 'Run ' + r.id}</b><div class="d2">${fmtClock(r.started_at)} · ${fmtAgo(r.started_at)}${r.id === h.liveId ? ' · sedang berjalan' : ''}</div></div><div class="r">${fmtTok(r.tokens_eq)}<br>${fmtDur(r.updated_at - r.started_at)}</div><button class="btn" type="button" data-act="hopen" data-id="${r.id}">Buka</button></div>`) : html`<div class="sub">Belum ada run tersimpan.</div>`}` };
}
