// Pemformat angka, durasi, dan jam. Koma desimal gaya Indonesia.
const dec = (n, d) => n.toFixed(d).replace('.', ',');
export function fmtTok(n) {
  if (n == null || isNaN(n)) return '—';
  n = Math.round(n);
  if (n >= 1e6) return dec(n / 1e6, n >= 1e7 ? 1 : 2) + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return dec(n / 1e3, 1) + 'k';
  return String(n);
}
export function fmtDur(ms) {
  if (ms == null || isNaN(ms)) return '—';
  if (ms < 1000) return Math.round(ms) + 'ms';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + String(s % 60).padStart(2, '0') + 's';
  return Math.floor(m / 60) + 'j ' + (m % 60) + 'm';
}
export const fmtClock = (t) => {
  const d = new Date(t); const p = (x) => String(x).padStart(2, '0');
  return p(d.getHours()) + '.' + p(d.getMinutes());
};
export const fmtAgo = (t, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return s + ' dtk lalu';
  if (s < 3600) return Math.round(s / 60) + ' mnt lalu';
  if (s < 86400) return Math.round(s / 3600) + ' jam lalu';
  return Math.round(s / 86400) + ' hari lalu';
};
// Setara input = masuk + 1,25 x cache tulis + 0,1 x cache baca + 5 x keluar (perkiraan beban, bukan tagihan).
export const eqOf = (u) => (u ? (u.in || 0) + 1.25 * (u.cc || 0) + 0.1 * (u.cr || 0) + 5 * (u.out || 0) : 0);
export const rawOf = (u) => (u ? (u.in || 0) + (u.out || 0) + (u.cr || 0) + (u.cc || 0) : 0);
export const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
export const plural = (n, one) => n + ' ' + one;
