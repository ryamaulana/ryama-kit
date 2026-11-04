// Klien data live: satu SSE per tab (?p= atau ?list=1), sambung ulang, bilah terputus.
// Keluar lewat CustomEvent di document: fv-state (snapshot), fv-projects (daftar), fv-conn ({open, lastAt}).
import { html, patch } from './dom.js';
import { statusIcon } from './icons.js';
import { fmtClock } from './format.js';

const CLOSED = 2; // EventSource.CLOSED
export const streamUrl = (route) => (route.p ? `/stream?p=${encodeURIComponent(route.p)}` : '/stream?list=1');
export const retryDelay = (n) => Math.min(1000 * 2 ** n, 10000);

// EventSource menyambung ulang sendiri saat jaringan putus, tapi berhenti (CLOSED) bila server menjawab
// non-200 (mis. 503 too_many_streams); kasus itu dicoba lagi di sini. Tidak ada pemantau macet diam-diam
// (shortcut: server mengirim ping 20 dtk, tapi EventSource tak menampakkannya; tambah bila terbukti perlu).
export function openStream(url, on, { ES = EventSource, wait = setTimeout, clear = clearTimeout } = {}) {
  let es, timer, tries = 0, closed = false;
  const msg = (kind) => (e) => { let d; try { d = JSON.parse(e.data); } catch { return; } on[kind](d); };
  const open = () => {
    es = new ES(url);
    es.onopen = () => { tries = 0; on.status(true); };
    es.onmessage = msg('state');
    es.addEventListener('projects', msg('projects'));
    es.onerror = () => {
      on.status(false);
      if (!closed && es.readyState === CLOSED) timer = wait(open, retryDelay(tries++));
    };
  };
  open();
  return () => { closed = true; clear(timer); es.close(); };
}

export function initLive() {
  const $ = (s) => document.querySelector(s);
  const emit = (type, detail) => document.dispatchEvent(new CustomEvent(type, { detail }));
  let stop, cur, lastAt = null;

  const status = (open) => {
    const bar = $('#offline');
    bar.hidden = open;
    $('#conn').classList.toggle('off', !open);
    patch($('#connt'), open ? 'terhubung' : 'terputus');
    if (!open) patch(bar, html`${statusIcon('waiting')}<span>Terputus dari server. Menyambung ulang otomatis${lastAt ? ` · diperbarui ${fmtClock(lastAt).slice(0, 5)}` : ''}</span>`);
    emit('fv-conn', { open, lastAt });
  };
  const got = (type) => (d) => { lastAt = Date.now(); emit(type, d); };

  // Tab terikat ke satu proyek: ganti tampilan (Live/Riwayat) tidak menyambung ulang, ganti proyek ya.
  document.addEventListener('fv-route', (e) => {
    const url = streamUrl(e.detail);
    if (url === cur) return;
    stop?.(); cur = url; lastAt = null;
    $('#offline').hidden = true; // menyambung: diam dulu, bilah muncul bila gagal
    stop = openStream(url, { status, state: got('fv-state'), projects: got('fv-projects') });
  });
}
