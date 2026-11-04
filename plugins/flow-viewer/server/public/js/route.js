// Logika rute murni (tanpa DOM): alamat -> rute, keputusan buka otomatis, migrasi kunci fv-view lama.
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

// "?p=id&v=riwayat" -> {p, view}. p tidak sah atau kosong -> null (Daftar proyek). v hanya bermakna bila ada p.
export function parseRoute(search) {
  const q = new URLSearchParams(search);
  const p = q.get('p');
  const ok = p && ID_RE.test(p) ? p : null;
  return { p: ok, view: ok && q.get('v') === 'riwayat' ? 'history' : 'live' };
}

export const routeUrl = ({ p, view }) => (p ? `?p=${encodeURIComponent(p)}${view === 'history' ? '&v=riwayat' : ''}` : '/');

// Tanpa p: tepat satu proyek aktif -> id-nya (tab terikat ke proyek itu); selain itu null -> tampilkan Daftar proyek.
export function soleActive(data) {
  const act = ((data && data.projects) || []).filter((x) => x && x.active);
  return act.length === 1 ? act[0].id : null;
}

// fv-view lama (1.7.1) menyimpan tab panel; kini tampilan ada di URL, tab panel di fv-tab. Idempoten.
const LEGACY_TABS = new Set(['token', 'backlog', 'skill', 'log', 'chat', 'files']);
export function migrateView(store) {
  try {
    const v = store.getItem('fv-view');
    if (v == null) return;
    if (LEGACY_TABS.has(v) && store.getItem('fv-tab') == null) store.setItem('fv-tab', v);
    store.removeItem('fv-view');
  } catch (e) { /* penyimpanan tidak tersedia: abaikan */ }
}
