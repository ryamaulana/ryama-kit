import { html } from '../dom.js';
import { metaOf, colorOf } from '../icons.js';
export const badge = (S) => ({ n: (S.fileList || []).length || '' });
export function view(S) {
  const L = S.fileList || [];
  if (!L.length) return { title: 'File diubah', sub: 'file yang disentuh agent di run ini', body: html`<div class="sub">Belum ada file yang diubah.</div>` };
  const by = {}; for (const f of L) (by[f.agent || 'claude'] = by[f.agent || 'claude'] || []).push(f);
  const add = L.reduce((a, f) => a + (f.add || 0), 0), del = L.reduce((a, f) => a + (f.del || 0), 0);
  return { title: 'File diubah', sub: `${L.length} file · +${add} −${del} baris`, body: html`${Object.entries(by).map(([a, fs]) => html`<div class="hs"><i class="dt" style="background:${colorOf(a)}"></i>${metaOf(a, S).label}<small>${fs.length}</small></div>${fs.map((f) => html`<div class="row"><span class="p mono" title="${f.path}">${f.path}</span><span class="ch ${f.created ? 'ok' : ''}">${f.created ? 'baru' : 'diubah'}</span><span class="r">+${f.add || 0} −${f.del || 0}</span></div>`)}`)}` };
}
