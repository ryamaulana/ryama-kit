import { html } from '../dom.js';
import { fmtClock } from '../format.js';
export const badge = () => ({ n: '' });
export function view(S) {
  const L = (S.log || []).slice(-120).reverse();
  return { title: 'Log kejadian', sub: 'terbaru di atas', body: L.length ? html`<div class="tlx">${L.map((e) => html`<div><span class="mono">${fmtClock(e.t)}</span>${e.text}</div>`)}</div>` : html`<div class="sub">Belum ada kejadian.</div>` };
}
