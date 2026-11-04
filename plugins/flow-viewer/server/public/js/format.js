// Format tampilan (bahasa Indonesia). Murni, tanpa DOM.
const num = (x) => (Number.isFinite(x) ? x : 0);

// 83000 -> "1 mnt 23 dtk"; 5000 -> "5 dtk"; 3720000 -> "1 jam 2 mnt"
export function fmtDur(ms) {
  const s = Math.max(0, Math.round(num(ms) / 1000));
  if (s < 60) return `${s} dtk`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt ${s % 60} dtk`;
  return `${Math.floor(m / 60)} jam ${m % 60} mnt`;
}

// Koma desimal; "rb" = ribu, "jt" = juta (UX.md memakai "jt"). Asumsi: ribuan memakai "rb".
const dec = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
export function fmtTok(n) {
  const v = Math.max(0, num(n));
  if (v < 1e3) return String(Math.round(v));
  if (v < 1e4) return `${dec(v / 1e3)} rb`;
  if (v < 1e6) return `${Math.round(v / 1e3)} rb`;
  return `${dec(v / 1e6)} jt`;
}

// Jam 24 jam "14.05.09". Tanpa Intl agar tak bergantung locale mesin.
export function fmtClock(t) {
  const d = new Date(t), p = (x) => String(x).padStart(2, '0');
  return `${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

// Token setara input (rumus sama dengan server/run.js eqOf): cache tulis 1,25x, baca 0,1x, output 5x.
export const eqOf = (u) => (u ? Math.round((u.in || 0) + (u.cc || 0) * 1.25 + (u.cr || 0) * 0.1 + (u.out || 0) * 5) : 0);
