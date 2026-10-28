import { $ } from './dom.js';
const KEY = 'fv-theme';
export function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#theme').textContent = t === 'dark' ? 'Terang' : 'Gelap';
  try { localStorage.setItem(KEY, t); } catch (_) { /* tanpa penyimpanan */ }
}
export function initTheme() {
  const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  $('#theme').textContent = cur === 'dark' ? 'Terang' : 'Gelap';
  $('#theme').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}
