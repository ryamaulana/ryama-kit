// Ikon status (DESIGN 3) selalu berpasangan dengan teks. Isi path konstanta, jadi aman lewat raw().
import { html, raw } from './dom.js';

const P = {
  running: '<path d="M12 3a9 9 0 1 0 9 9"/>',
  done: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  input: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1.9-1.1 1.6M12 16.6v.1"/>',
  failed: '<path d="m6 6 12 12M18 6 6 18"/>',
  skipped: '<path d="m5 6 6 6-6 6M12 6l6 6-6 6"/>',
  waiting: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

// Nama status snapshot (idle/optional/pending = Menunggu) -> kunci ikon.
const ALIAS = { idle: 'waiting', optional: 'waiting', pending: 'waiting', question: 'input', paused: 'input' };

export const STATUS = {
  running: 'Berjalan', done: 'Selesai', input: 'Butuh input',
  failed: 'Gagal', skipped: 'Dilewati', waiting: 'Menunggu',
};

export const statusKey = (s) => (Object.hasOwn(STATUS, s) ? s : ALIAS[s] || 'waiting');
export const statusLabel = (s) => STATUS[statusKey(s)];

// Ikon dekoratif (aria-hidden): teks status selalu ada di sebelahnya.
export const statusIcon = (s) => {
  const k = statusKey(s);
  return html`<svg class="ic ic-${k}" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(P[k])}</svg>`;
};
