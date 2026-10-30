// Markdown sederhana untuk laporan token (judul, daftar, tabel, paragraf). Semua teks di-escape.
import { esc } from './dom.js';

export function mdToHtml(md) {
  const out = [], lines = String(md || '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => esc(c.trim()));
      const body = rows.filter((r) => !/^\|[\s|:-]+\|$/.test(r));
      const [h, ...rest] = body;
      out.push(`<div class="mdt"><table><thead><tr>${cells(h).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (/^# /.test(l)) out.push(`<h2>${esc(l.slice(2))}</h2>`);
    else if (/^## /.test(l)) out.push(`<div class="hs">${esc(l.slice(3))}</div>`);
    else if (/^- /.test(l)) { const it = []; while (i < lines.length && /^- /.test(lines[i])) it.push(`<li>${esc(lines[i++].slice(2))}</li>`); i--; out.push(`<ul class="mdl">${it.join('')}</ul>`); }
    else if (l.trim()) out.push(`<p class="sub">${esc(l)}</p>`);
  }
  return out.join('');
}
