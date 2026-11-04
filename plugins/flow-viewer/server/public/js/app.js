// Rute halaman: Daftar proyek (/), tampilan proyek (?p=), Riwayat (?p=&v=riwayat). Data live dan isi layar: modul lain.
import { html, patch } from './dom.js';
import { parseRoute, routeUrl, soleActive, migrateView } from './route.js';
import { initLive } from './api.js';
import { initGraph } from './graph.js';

const $ = (s) => document.querySelector(s);
const show = (sel, on) => { const el = $(sel); if (el) el.hidden = !on; };
let seq = 0; // render terakhir menang bila alamat berubah saat /projects masih dimuat

function paint(route, extra = {}) {
  const proj = !!route.p, hist = proj && route.view === 'history';
  for (const s of ['#proj', '#tabs', '#strip', '#side']) show(s, proj);
  show('#stage', proj && !hist); show('#history', hist); show('#plist', !proj);
  for (const b of document.querySelectorAll('#tabs button[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === (hist ? 'history' : 'live')));
  document.title = proj ? `${route.p} · Flow Viewer` : 'Flow Viewer';
  document.body.dataset.route = proj ? 'project' : 'list';
  document.body.dataset.view = hist ? 'history' : 'live';
  document.dispatchEvent(new CustomEvent('fv-route', { detail: { ...route, ...extra } }));
}

const note = (t, retry) => patch($('#plist'), html`<h2>Proyek</h2><p role="status">${t}</p>${retry ? html`<button type="button" data-act="retry">Coba lagi</button>` : ''}`);

async function render() {
  const mine = ++seq, route = parseRoute(location.search);
  if (route.p) return paint(route);
  paint(route);
  note('Memuat daftar proyek...');
  let data;
  try {
    const r = await fetch('/projects');
    if (!r.ok) throw new Error(String(r.status));
    data = await r.json();
  } catch (e) {
    if (mine === seq) note('Daftar proyek tidak bisa dimuat.', true);
    return;
  }
  if (mine !== seq) return;
  const id = soleActive(data);
  if (id) { history.replaceState(null, '', routeUrl({ p: id, view: 'live' })); return render(); }
  patch($('#plist'), html`<h2>Proyek</h2>`);
  paint(route, { projects: data });
}

// Ganti tampilan tanpa muat ulang; tombol Kembali tetap bekerja lewat popstate.
function go(view) {
  const cur = parseRoute(location.search);
  if (!cur.p || cur.view === view) return;
  history.pushState(null, '', routeUrl({ p: cur.p, view }));
  render();
}

migrateView(localStorage);
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) go(b.dataset.v === 'history' ? 'history' : 'live'); });
$('#plist').addEventListener('click', (e) => { if (e.target.closest('[data-act=retry]')) render(); });
addEventListener('popstate', render);
initLive();
initGraph();
render();
