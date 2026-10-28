import { html } from '../dom.js';
import { metaOf, colorOf } from '../icons.js';
import { MAIN } from '../model.js';
const calls = (S) => (S.skillCalls || []);
export const badge = (S) => ({ n: calls(S).length || '' });
export function view(S) {
  const L = calls(S);
  if (!L.length) return { title: 'Skill', sub: 'skill yang dipanggil di run ini', body: html`<div class="sub">Belum ada skill yang dipanggil.</div>` };
  const by = {}; for (const c of L) (by[c.name] = by[c.name] || []).push(c);
  return { title: 'Skill', sub: `${Object.keys(by).length} skill · ${L.length} panggilan`, body: html`${Object.entries(by).map(([n, cs]) => html`<div class="row"><b>${n}</b><span class="r">${cs.length}×</span></div><div class="chs" style="margin:0 0 8px">${Array.from(new Set(cs.map((c) => c.agent || MAIN))).map((a) => html`<span class="ch" style="color:${colorOf(a)}">${metaOf(a, S).label}</span>`)}</div>`)}` };
}
