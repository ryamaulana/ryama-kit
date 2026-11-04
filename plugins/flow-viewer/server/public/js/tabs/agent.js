// Detail agent satu kolom (UX 6.2, ARCH 10.2a): kepala, jawaban satu kalimat, tiga angka, lalu bagian lipat.
// Kerangka t19a: isi bagian dan peringatan (#dwarn) dipasang di t19b lewat BODY dan warnings().
// Status lipat disimpan satu untuk semua agent di localStorage fv-dsec = JSON {<sec>: true|false}.
import { html } from '../dom.js';
import { MAIN, PROMPT, agentStatus, asks } from '../graph.js';
import { statusIcon, statusLabel } from '../icons.js';
import { fmtDur, fmtTok, eqOf } from '../format.js';

export const SEC_KEY = 'fv-dsec';
// Urutan tetap. open = bawaan terbuka untuk agent yang sudah jalan.
export const SECS = [
  { id: 'hasil', title: 'Hasil', open: true },
  { id: 'files', title: 'File berubah', open: true },
  { id: 'tugas', title: 'Tugas yang diberikan' },
  { id: 'langkah', title: 'Langkah kerja' },
  { id: 'skill', title: 'Skill' },
  { id: 'model', title: 'Model dan izin' },
  { id: 'token', title: 'Pemakaian token' },
  { id: 'def', title: 'Definisi agent' },
];
const NOT_RUN = ['skill', 'model', 'def']; // agent belum jalan: hanya tiga ini (ARCH 10.2a)

export const ran = (n) => !!n && (n.count > 0 || ['running', 'done', 'failed', 'error'].includes(n.status));
export const visibleSecs = (n) => SECS.filter((s) => ran(n) || NOT_RUN.includes(s.id));

// Nilai rusak atau bukan objek = abaikan (bawaan berlaku). Hanya boolean yang dipakai.
export function readSecs(raw) {
  let o;
  try { o = JSON.parse(raw); } catch (e) { return {}; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
  return Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'boolean'));
}
// Belum pernah diatur: agent yang sudah jalan memakai bawaan; yang belum jalan membuka ketiga bagiannya (UX 6.2).
export const isOpen = (state, sec, n) => (typeof state[sec] === 'boolean' ? state[sec] : ran(n) ? !!SECS.find((s) => s.id === sec)?.open : true);
export const toggled = (state, sec, n) => ({ ...state, [sec]: !isOpen(state, sec, n) });

function answer(S, id, n, st) {
  if (!ran(n)) return 'Belum jalan di run ini.';
  if (st === 'input') { const q = asks(S).find((a) => a.agent === id); return q ? q.text : 'Butuh input.'; }
  if (st === 'failed') return n.failReason || 'Gagal tanpa alasan tercatat';
  if (st === 'running') return n.last ? `Sedang: ${n.last}` : 'Sedang berjalan.';
  const first = String(n.snippet || '').split('\n').find((l) => l.trim());
  return first ? first.trim() : 'Belum ada hasil.';
}

// Isi bagian: t19b. Sementara satu baris keterangan supaya bagian terbuka tidak kosong.
const BODY = {};
const body = (sec, S, id, n) => (BODY[sec] ? BODY[sec](S, id, n) : html`<p class="empty">Belum tersedia.</p>`);

// Hasil: potongan terpisah supaya panel menulisnya ke #dhead, #dwarn, #dans, #dnums, #dsecs.
export function agentView(S, id, state = {}) {
  S = S || {};
  const n = (S.nodes || {})[id];
  if (!n || id === MAIN || id === PROMPT) return null;
  const st = agentStatus(S, id), ok = ran(n);
  const u = n.usage;
  const head = html`<div class="dh"><div class="dh-main"><h3 id="dname">${n.label || (((S.crewMeta || []).find((m) => m.id === id)) || {}).label || id}</h3><span class="st st-${st}">${statusIcon(st)}${statusLabel(st)}</span></div>${n.role ? html`<p class="dh-role">${n.role}</p>` : ''}</div><button type="button" class="ib" data-act="pclose" aria-label="Tutup detail agent"><span aria-hidden="true">×</span></button>`;
  const ans = html`<p>${answer(S, id, n, st)}</p>`;
  const nums = ok ? html`<dl class="dn"><div><dt>Durasi</dt><dd>${n.ms ? fmtDur(n.ms) : 'menunggu data'}</dd></div><div><dt>Token setara</dt><dd>${u ? fmtTok(eqOf(u)) : 'menunggu data'}</dd></div><div><dt>Putaran</dt><dd>${n.count || 0}</dd></div></dl>` : '';
  const secs = visibleSecs(n).map((s) => {
    const open = isOpen(state, s.id, n);
    return html`<section class="dsec" data-sec="${s.id}"><h3><button type="button" data-act="dtoggle" data-sec="${s.id}" aria-expanded="${String(open)}" aria-controls="dsb-${s.id}">${s.title}</button></h3>${open ? html`<div id="dsb-${s.id}" class="dsb">${body(s.id, S, id, n)}</div>` : ''}</section>`;
  });
  return { head, warn: '', ans, nums, secs: html`${secs}` };
}
