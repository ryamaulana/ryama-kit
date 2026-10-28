// Tag `html` yang meng-escape semua sisipan. Hanya raw() (ikon dari kode kita sendiri) yang tidak di-escape.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
class Raw { constructor(s) { this.s = s; } }
export const raw = (s) => new Raw(String(s));
function part(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v === false || v == null) return '';
  return esc(v);
}
export function html(strs, ...vals) {
  let o = strs[0];
  vals.forEach((v, i) => { o += part(v) + strs[i + 1]; });
  return new Raw(o);
}
export const str = (h) => (h instanceof Raw ? h.s : esc(h));
// Tulis ke elemen hanya bila isinya berubah (menjaga scroll, fokus, dan animasi).
export function patch(el, h) {
  const s = str(h);
  if (el.__s === s) return false;
  el.innerHTML = s; el.__s = s; return true;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function on(root, type, sel, fn) {
  root.addEventListener(type, (e) => { const t = e.target.closest(sel); if (t && root.contains(t)) fn(e, t); });
}
