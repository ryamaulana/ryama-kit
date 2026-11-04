// Tab Percakapan (F9-1): salinan percakapan Claude Code, hanya baca. Data 1.7.1: GET /detail?id=__convo, dimuat ulang saat S.convoN berubah.
import { html } from '../dom.js';
import { fmtClock } from '../format.js';

const LONG = 400;

// Penyimpan percakapan: satu muatan sekali jalan; galat tidak dicoba ulang otomatis (tombol "Coba lagi" memanggil retry).
export function createConvo(get = (u) => fetch(u)) {
  const st = { list: null, key: '', err: false, busy: false };
  let gen = 0;
  const api = {
    st,
    need: (key) => !st.busy && !st.err && st.key !== key,
    reset() { gen++; Object.assign(st, { list: null, key: '', err: false, busy: false }); },
    retry() { st.err = false; },
    async load(project, key) {
      const mine = gen;
      st.busy = true;
      try {
        const r = await get(`/detail?p=${encodeURIComponent(project)}&id=__convo`);
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        if (mine !== gen) return;
        st.list = Array.isArray(d.convo) ? d.convo : []; st.key = key; st.err = false;
      } catch (e) {
        if (mine === gen) st.err = true;
      } finally {
        if (mine === gen) st.busy = false;
      }
    },
  };
  return api;
}

const nameOf = (S, id) => (id ? ((S.crewMeta || []).find((m) => m.id === id) || {}).label || id : '');

function opts(list) {
  return html`<ol class="opts">${(list || []).map((o) => html`<li>${o.label}${o.description ? html` <span class="more">${o.description}</span>` : ''}</li>`)}</ol>`;
}

// Satu pesan -> <li>. Teks panjang dipotong dengan "Tampilkan semua" (memperluas di tempat).
function message(S, c, i, ctx) {
  const when = fmtClock(c.t), ag = nameOf(S, c.agent), key = `${c.t}:${i}`;
  const p = S.pending, last = i === ctx.n - 1;
  if (c.kind === 'notify') return html`<li class="m">${when} · ${c.text}</li>`;
  let who = `${when} · ${c.kind === 'agent' ? ag || 'Agent' : 'Claude'}`, cls = 'm', body, hint = '';
  if (c.kind === 'user') { who = `${when} · Kamu`; cls = 'm m-you'; } else if (c.kind === 'answer') { who = `${when} · Jawabanmu`; cls = 'm m-you'; } else if (c.kind === 'error') who = `${when} · Galat${ag ? ' · ' + ag : ''}`;
  else if (c.kind === 'permission') { who = `${when} · Minta izin${ag ? ' · ' + ag : ''}`; cls = 'm m-ask'; if (p && p.kind === 'permission' && last) hint = 'Setujui di aplikasi Claude.'; } else if (c.kind === 'question') {
    who = `${when} · Claude bertanya${ag ? ' · ' + ag : ''}`; cls = 'm m-ask';
    if (p && p.kind === 'question' && i === ctx.lastQ) hint = 'Jawab di aplikasi Claude.';
    if (c.questions && c.questions.length) body = html`${c.questions.map((q) => html`<p><b>${q.question}</b></p>${opts(q.options)}`)}`;
  }
  if (!body) {
    const t = String(c.text || ''), cut = t.length > LONG && !ctx.open.has(key);
    body = html`${cut ? t.slice(0, LONG) + '…' : t}${t.length > LONG ? html` <button type="button" class="lnk" data-k="${key}" aria-expanded="${String(!cut)}">${cut ? 'Tampilkan semua' : 'Ringkas'}</button>` : ''}`;
  }
  return html`<li class="${cls}"><span class="m-w">${who}</span>${body}${hint ? html`<p class="more">${hint}</p>` : ''}</li>`;
}

export function chatView(S, st, open = new Set()) {
  const err = st.err ? html`<div class="callout co-failed" role="alert"><div><strong>Percakapan gagal dimuat.</strong><button type="button" class="lnk" data-act="retry-chat">Coba lagi</button></div></div>` : '';
  if (st.list == null) return st.err ? err : html`<p class="empty" role="status">Memuat percakapan...</p>`;
  if (!st.list.length) return html`${err}<p class="empty">Belum ada percakapan. Prompt kamu dan balasan Claude akan muncul di sini.</p>`;
  const ctx = { open, n: st.list.length, lastQ: -1 };
  for (let i = st.list.length - 1; i >= 0; i--) if (st.list[i].kind === 'question') { ctx.lastQ = i; break; }
  return html`${err}<ul class="msgs">${st.list.map((c, i) => message(S, c, i, ctx))}</ul>`;
}
