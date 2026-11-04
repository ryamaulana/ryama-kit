// [SEC] Satu-satunya tempat HTML dibuat dan ditulis ke DOM. Semua sisipan di-escape; raw() hanya untuk konstanta (ikon).
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESC[c]);

export const raw = (s) => new Safe(String(s));

const part = (v) => (v instanceof Safe ? v.s : Array.isArray(v) ? v.map(part).join('') : v == null || v === false ? '' : esc(v));

export const html = (strings, ...vals) => new Safe(strings.reduce((out, s, i) => out + s + (i < vals.length ? part(vals[i]) : ''), ''));

const last = new WeakMap();

// Tulis hanya bila berubah. Safe -> HTML; string biasa -> teks (tidak pernah dianggap HTML).
export function patch(el, v) {
  const isHtml = v instanceof Safe;
  const text = isHtml ? v.s : String(v ?? '');
  const key = (isHtml ? 'h:' : 't:') + text;
  if (last.get(el) === key) return false;
  last.set(el, key);
  if (isHtml) el.innerHTML = text; else el.textContent = text;
  return true;
}
