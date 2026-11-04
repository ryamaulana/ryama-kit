// Panel samping + rel enam kunci (F9-1). Rel: chat, backlog, files, skill, token, log (agent dan history bukan kunci rel, ARCH 10.2a).
// Masuk: fv-state, fv-route, fv-pick (node dipilih), fv-tab ({tab}: buka tab dari modul lain). Keluar: fv-unpick (Esc), fv-view-save/fv-view-restore (graph.js).
// Disimpan per browser: fv-tab, fv-side-w, fv-side-c (hanya di 1200+; di 900-1199 panel selalu mulai tertutup), fv-dsec (status lipat detail agent).
// Detail agent (#drawer) menggantikan #pan di dalam #side. Esc: 1200+ kembali ke tab data terakhir; 900-1199 menutup panel dan grafik kembali ke posisi + zoom sebelum node dipilih.
import { html, raw, patch } from './dom.js';
import { chatView, createConvo } from './tabs/chat.js';
import { backlogView } from './tabs/backlog.js';
import { agentView, readSecs, toggled, SEC_KEY } from './tabs/agent.js';
import { MAIN, PROMPT } from './graph.js';

export const RAIL = ['chat', 'backlog', 'files', 'skill', 'token', 'log'];
export const TITLES = { chat: 'Percakapan', backlog: 'Backlog', files: 'File', skill: 'Skill', token: 'Token', log: 'Log' };
const ICON = {
  chat: '<path d="M4 5h16v11h-9l-4 4v-4H4z"/>',
  backlog: '<path d="M9 6h11 M9 12h11 M9 18h11 M3.5 6l1 1 2-2 M3.5 12l1 1 2-2 M3.5 18l1 1 2-2"/>',
  files: '<path d="M3 6h6l2 2h10v11H3z"/>',
  skill: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h11"/>',
  token: '<path d="M4 17a8 8 0 1 1 16 0 M12 17l4-5"/>',
  log: '<path d="M4 6h16 M4 12h16 M4 18h10"/>',
};
export const WIDE = 1200, W_MIN = 320, W_DEFAULT = 380;

export const validTab = (t) => (RAIL.includes(t) ? t : 'chat');
export const clampWidth = (w, vw) => Math.max(W_MIN, Math.min(Number.isFinite(w) ? w : W_DEFAULT, Math.round(vw * 0.6)));
// 900-1199: tertutup tiap kali; 1200+: ikut pilihan tersimpan (bawaan terbuka).
export const startCollapsed = (vw, stored) => (vw < WIDE ? true : stored === '1');

// Lencana rel: hanya angka yang berarti tindakan (UX 5). warn = Percakapan bertanya dan Backlog keputusan.
const isAsk = (a) => a.kind === 'question' || a.kind === 'permission';
export function badges(S) {
  S = S || {};
  const att = Array.isArray(S.attention) ? S.attention : null;
  const ask = att ? att.filter(isAsk).length : (S.pending && S.pending.text ? 1 : 0);
  const dec = att ? att.filter((a) => a.kind === 'decision').length : ((S.backlog && S.backlog.items) || []).filter((i) => i.owner && (i.status === 'ready' || i.status === 'running')).length;
  const unproven = Object.values(S.nodes || {}).filter((n) => n.status === 'done' && (n.skillsDef || []).some((k) => !((n.usage && n.usage.skillEv) || {})[k] && !(n.skills || []).includes(k))).length;
  const files = (S.fileList || []).length;
  const out = {};
  if (ask) out.chat = { n: ask, warn: true, label: `${ask} menunggu jawaban` };
  if (dec) out.backlog = { n: dec, warn: true, label: `${dec} perlu keputusan` };
  if (files) out.files = { n: files, label: `${files} file` };
  if (unproven) out.skill = { n: unproven, label: `${unproven} agent dengan skill belum terbukti` };
  return out;
}

// Geser gulir minimal (px) supaya kotak node terlihat penuh di dalam area gulir, dengan jarak m dari tepi.
export function scrollDelta(n, v, m = 16) {
  const d = (a0, a1, b0, b1) => (a0 < b0 + m ? a0 - b0 - m : a1 > b1 - m ? a1 - b1 + m : 0);
  return { dx: d(n.left, n.right, v.left, v.right), dy: d(n.top, n.bottom, v.top, v.bottom) };
}

const icon = (k) => html`<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${raw(ICON[k])}</svg>`;

export function initPanel() {
  const $ = (s) => document.querySelector(s);
  const side = $('#side'), pan = $('#pan'), drawer = $('#drawer'), rail = $('#rail'), body = $('#pi'), rz = $('#rz'), tchat = $('#tchat'), dock = $('#dock');
  if (!side || !rail || !body) return;
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* tanpa penyimpanan: pilihan tidak diingat */ } };
  const narrow = () => innerWidth < WIDE;
  let S = null, project = null, tab = validTab(get('fv-tab')), w = parseFloat(get('fv-side-w'));
  let collapsed = startCollapsed(innerWidth, get('fv-side-c'));
  let agentId = null, snap = false; // snap: grafik sudah menyimpan posisi + zoom untuk dipulihkan saat panel menutup (900-1199)
  let dsec = readSecs(get(SEC_KEY));
  const convo = createConvo(), openMsg = new Set();

  const view = () => {
    if (tab === 'chat') return chatView(S || {}, convo.st, openMsg);
    if (tab === 'backlog') return backlogView(S);
    return html`<p class="empty">Belum tersedia.</p>`; // files, skill, token, log: dibangun di t18b dan t18c
  };

  function reveal() { // masalah #5: node terpilih tetap terlihat setelah panel mendorong grafik
    const sc = $('#gscroll'), n = $('#canvas .node.sel');
    if (!sc || !n) return;
    const { dx, dy } = scrollDelta(n.getBoundingClientRect(), sc.getBoundingClientRect());
    if (dx) sc.scrollLeft += dx;
    if (dy) sc.scrollTop += dy;
  }
  // Dua bingkai: ResizeObserver grafik menggambar ulang setelah tata letak berubah.
  const revealLater = () => requestAnimationFrame(() => requestAnimationFrame(reveal));

  // Pulihkan setelah tata letak menyusut kembali (dua bingkai, sama seperti reveal).
  const restoreLater = () => requestAnimationFrame(() => requestAnimationFrame(() => document.dispatchEvent(new CustomEvent('fv-view-restore'))));

  function drawDrawer() {
    const on = !!agentId && !collapsed, v = on ? agentView(S, agentId, dsec) : null;
    pan.hidden = !!v; drawer.hidden = !v;
    if (!v) return;
    drawer.setAttribute('role', 'region'); drawer.setAttribute('aria-labelledby', 'dname');
    const f = document.activeElement, sec = drawer.contains(f) ? f.dataset.sec || f.dataset.act : null;
    const changed = [['#dhead', v.head], ['#dwarn', v.warn], ['#dans', v.ans], ['#dnums', v.nums], ['#dsecs', v.secs]].map(([q, x]) => patch($(q), x));
    // patch mengganti tombol: fokus keyboard kembali ke tombol yang sama
    if (sec && changed.includes(true)) drawer.querySelector(`[data-sec="${sec}"][data-act],[data-act="${sec}"]`)?.focus({ preventScroll: true });
  }

  function ensureConvo() {
    if (tab !== 'chat' || collapsed || !S || !project) return;
    const key = `${S.runId}:${S.convoN}`;
    if (convo.need(key)) { const p = project; convo.load(p, key).then(() => { if (p === project) draw(); }); }
  }

  function draw() {
    const b = badges(S);
    for (const btn of rail.querySelectorAll('button[data-v]')) {
      const k = btn.dataset.v, bd = b[k], on = !collapsed && !agentId && tab === k;
      btn.className = 'rb';
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', bd ? `${TITLES[k]}, ${bd.label}` : TITLES[k]);
      btn.title = TITLES[k];
      patch(btn, html`${icon(k)}${bd ? html`<span class="badge${bd.warn ? ' badge-warn' : ''}">${bd.n}</span>` : ''}`);
    }
    patch($('#ptitle'), TITLES[tab]);
    drawDrawer();
    if (collapsed || agentId) return;
    const near = body.scrollHeight - body.scrollTop - body.clientHeight < 90;
    if (patch(body, view()) && tab === 'chat' && near) body.scrollTop = body.scrollHeight;
    ensureConvo();
  }

  function apply() {
    side.classList.toggle('collapsed', collapsed);
    side.style.width = narrow() ? '' : `${clampWidth(w, innerWidth)}px`;
    tchat?.setAttribute('aria-expanded', String(!collapsed));
    draw();
    revealLater();
  }
  const setCollapsed = (c) => {
    collapsed = c;
    if (c && snap) { snap = false; if (narrow()) restoreLater(); } if (!narrow()) put('fv-side-c', c ? '1' : '0'); apply();
  };
  function open(k) {
    if (agentId) { agentId = null; document.dispatchEvent(new CustomEvent('fv-unpick')); snap = false; }
    if (k !== tab) { tab = k; put('fv-tab', k); body.scrollTop = 0; patch(body, ''); }
    setCollapsed(false);
    if (tab === 'chat') body.scrollTop = body.scrollHeight;
  }

  rail.addEventListener('click', (e) => {
    const k = e.target.closest('button[data-v]')?.dataset.v;
    if (!k) return;
    if (!collapsed && !agentId && tab === k && narrow()) setCollapsed(true); else open(k); // 900-1199: klik tab aktif menutup
  });
  tchat?.addEventListener('click', () => setCollapsed(!collapsed));
  body.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (k) { openMsg.has(k) ? openMsg.delete(k) : openMsg.add(k); patch(body, view()); }
    if (e.target.closest('[data-act=retry-chat]')) { convo.retry(); ensureConvo(); draw(); }
  });

  // Lebar: tarik tepi kiri panel (320 sampai 60% layar) atau panah kiri/kanan; klik dua kali = bawaan.
  const setW = (x, save) => { w = clampWidth(x, innerWidth); side.style.width = `${w}px`; rz.setAttribute('aria-valuenow', String(w)); if (save) put('fv-side-w', w); };
  if (rz) {
    rz.setAttribute('aria-valuemin', String(W_MIN));
    rz.addEventListener('pointerdown', (e) => { rz.setPointerCapture(e.pointerId); rz.dataset.on = '1'; e.preventDefault(); });
    rz.addEventListener('pointermove', (e) => { if (rz.dataset.on) setW(side.getBoundingClientRect().right - e.clientX, false); });
    const end = () => { if (rz.dataset.on) { delete rz.dataset.on; put('fv-side-w', w); revealLater(); } };
    rz.addEventListener('pointerup', end); rz.addEventListener('pointercancel', end);
    rz.addEventListener('dblclick', () => { setW(W_DEFAULT, true); revealLater(); });
    rz.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowLeft' ? 24 : e.key === 'ArrowRight' ? -24 : 0;
      if (!d) return;
      e.preventDefault();
      setW((w || W_DEFAULT) + d, true); revealLater();
    });
  }

  addEventListener('resize', () => { if (!narrow()) side.style.width = `${clampWidth(w, innerWidth)}px`; });
  matchMedia(`(min-width: ${WIDE}px)`).addEventListener('change', () => { collapsed = startCollapsed(innerWidth, get('fv-side-c')); apply(); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !$('#modal').hidden || !$('#pmenu').hidden) return;
    leave();
  });
  // Keluar dari detail agent (Esc atau tombol tutup). 1200+: panel tetap terbuka di tab data terakhir; 900-1199: panel menutup.
  function leave() {
    document.dispatchEvent(new CustomEvent('fv-unpick'));
    const was = agentId;
    agentId = null;
    if (narrow() && !collapsed) setCollapsed(true);
    else { snap = false; if (was) apply(); }
  }
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-act=pclose]')) return leave();
    const sec = e.target.closest('[data-act=dtoggle]')?.dataset.sec;
    if (!sec) return;
    dsec = toggled(dsec, sec, S && (S.nodes || {})[agentId]);
    put(SEC_KEY, JSON.stringify(dsec));
    drawDrawer();
  });
  document.addEventListener('fv-pick', (e) => {
    const id = e.detail && e.detail.id;
    if (narrow() && !snap) { snap = true; document.dispatchEvent(new CustomEvent('fv-view-save')); } // sebelum panel mendorong grafik
    if (id === PROMPT || id === MAIN) return open('chat'); // bukan agent: tidak ada detail satu kolom
    if (id !== agentId) drawer.scrollTop = 0;
    agentId = id;
    setCollapsed(false);
  });
  document.addEventListener('fv-tab', (e) => { const k = e.detail && e.detail.tab; if (RAIL.includes(k)) open(k); });
  document.addEventListener('fv-route', (e) => {
    if (dock) dock.hidden = !e.detail.p;
    if (e.detail.p !== project) { project = e.detail.p; S = null; agentId = null; snap = false; convo.reset(); openMsg.clear(); draw(); }
  });
  document.addEventListener('fv-state', (e) => { S = e.detail; draw(); });
  if (rz) rz.setAttribute('aria-valuenow', String(clampWidth(w, innerWidth)));
  apply();
}
