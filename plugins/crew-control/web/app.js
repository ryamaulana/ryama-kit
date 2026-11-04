// Tampilan polos Crew Control. Semua teks dari server/agent dipasang lewat textContent (bukan HTML).
import { STATUS_LABEL, allowedActions, applyEvent, buildQuestionAnswer, describeAnswer, emptyState, isSendKey } from './lib.js';

const app = document.getElementById('app');
const galat = document.getElementById('galat');
let cleanup = () => {};

/** Buat elemen: h('button', { type: 'button', onclick }, 'teks', anak). */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}

const showError = (msg) => { galat.textContent = msg ?? ''; };

async function api(method, url, body) {
  let r;
  try {
    r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('Server tidak terjangkau. Cek apakah server masih jalan.');
  }
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error?.message ?? `Galat ${r.status}`);
  return data;
}
/** Jalankan aksi; galat API ditampilkan di region alert. */
const act = async (fn) => { showError(''); try { return await fn(); } catch (e) { showError(e.message); } };

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('id-ID') : '');
const statusText = (s) => STATUS_LABEL[s] ?? s;

/**
 * Kotak ketik ala aplikasi Claude: Enter kirim, Shift+Enter baris baru. onSend(teks) harus melempar bila gagal
 * (teks dipertahankan); sukses mengosongkan kotak. extra = elemen tambahan di atas kotak.
 */
function composer({ label, sendLabel, maxlength, onSend, extra = [] }) {
  const ta = h('textarea', { id: `ketik-${Math.random().toString(36).slice(2, 7)}`, rows: 3, maxlength, 'aria-describedby': undefined });
  const btn = h('button', { type: 'submit' }, sendLabel);
  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      if (!ta.value.trim() || btn.disabled) return;
      showError(''); btn.disabled = true;
      try { await onSend(ta.value); ta.value = ''; } catch (err) { showError(err.message); } finally { btn.disabled = false; ta.focus(); }
    },
  }, extra, h('label', { for: ta.id }, label), h('br'), ta, h('br'), btn, h('small', {}, ' Enter kirim, Shift+Enter baris baru'));
  ta.addEventListener('keydown', (e) => { if (isSendKey(e)) { e.preventDefault(); form.requestSubmit(); } });
  return { form, ta, btn, setEnabled: (on) => { ta.disabled = btn.disabled = !on; } };
}

/** Pemilih folder: mulai di folder kerja, telusuri turun bertahap lewat /api/folders. get() = path terpilih. */
function folderPicker(root) {
  let chosen = root;
  const current = h('output', {}, root);
  const panel = h('div', { hidden: true });
  const toggle = h('button', { type: 'button', 'aria-expanded': 'false' }, 'Ganti folder');
  let listing = null;

  async function go(path) {
    try { listing = await api('GET', `/api/folders${path ? `?path=${encodeURIComponent(path)}` : ''}`); } catch (e) { showError(e.message); return; }
    showError('');
    const items = listing.folders.map((f) => h('li', {}, h('button', { type: 'button', onclick: () => go(f.path) }, `${f.name} →`)));
    panel.replaceChildren(
      h('p', {}, h('strong', {}, listing.path)),
      h('p', {},
        listing.parent ? h('button', { type: 'button', onclick: () => go(listing.parent) }, '← Naik') : null, ' ',
        h('button', { type: 'button', onclick: () => { chosen = listing.path; current.textContent = chosen; panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); } }, 'Pilih folder ini')),
      items.length ? h('ul', { 'aria-label': 'Subfolder' }, items) : h('p', {}, 'Tidak ada subfolder di sini.'));
  }
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) go(chosen);
  });
  return { el: h('div', {}, h('span', {}, 'Folder: '), current, ' ', toggle, panel), get: () => chosen };
}

// ---------- Daftar run + Chat baru ----------
async function viewHome() {
  const list = h('ul');
  const listBox = h('section', { 'aria-labelledby': 'h-daftar' }, h('h2', { id: 'h-daftar' }, 'Daftar run'), list);
  const newBox = h('section', { 'aria-labelledby': 'h-baru' }, h('h2', { id: 'h-baru' }, 'Chat baru'), h('p', {}, 'Memuat…'));
  app.replaceChildren(h('h1', {}, 'Run'), listBox, newBox);

  act(async () => {
    const cfg = await api('GET', '/api/config');
    const picker = folderPicker(cfg.workRoot);
    const model = h('select', { id: 'model' }, cfg.models.map((m) => h('option', { value: m.id, selected: m.id === cfg.defaultModel }, `${m.label}: ${m.description}`)));
    const c = composer({
      label: 'Apa yang mau dikerjakan?', sendLabel: 'Mulai', maxlength: 20000,
      extra: [picker.el, h('p', {}, h('label', { for: 'model' }, 'Model '), model)],
      onSend: async (prompt) => {
        const run = await api('POST', '/api/runs', { project: picker.get(), prompt, model: model.value });
        location.hash = `#/run/${run.id}`;
      },
    });
    newBox.replaceChildren(h('h2', { id: 'h-baru' }, 'Chat baru'), c.form);
  });

  const refresh = async () => {
    try {
      const { runs } = await api('GET', '/api/runs');
      showError('');
      list.replaceChildren(...(runs.length
        ? runs.map((r) => h('li', {}, h('a', { href: `#/run/${r.id}` }, `${r.projectName}: ${r.prompt.slice(0, 80)}`),
          ` [${statusText(r.status)}${r.pending ? `, ${r.pending} menunggu kamu` : ''}] `, h('time', { datetime: r.startedAt }, fmtTime(r.startedAt))))
        : [h('li', {}, 'Belum ada run. Isi Run baru di atas.')]));
    } catch (e) { showError(e.message); }
  };
  refresh();
  const t = setInterval(refresh, 3000);
  cleanup = () => clearInterval(t);
}

// ---------- Layar run ----------
function viewRun(id) {
  let state = emptyState();
  const els = new Map(); // id pesan -> elemen, supaya kotak ketik di form tidak hilang saat event lain datang
  const head = h('section', { 'aria-label': 'Status run' });
  const status = h('p', { role: 'status' });
  const chat = h('div', { role: 'log', 'aria-label': 'Chat' });
  const tools = h('ol', { 'aria-label': 'Aktivitas' });
  const conn = h('p', {}, 'Menyambung…');

  const msgBox = composer({
    label: 'Pesan ke agent', sendLabel: 'Kirim', maxlength: 8000,
    onSend: (text) => api('POST', `/api/runs/${id}/messages`, { text }),
  });
  const msgForm = msgBox.form;
  const promptEl = h('article', { 'data-kind': 'owner' });

  const post = (action) => () => act(() => api('POST', `/api/runs/${id}/${action}`, {}));
  const bPause = h('button', { type: 'button', onclick: post('pause') }, 'Jeda');
  const bResume = h('button', { type: 'button', onclick: post('resume') }, 'Lanjut');
  const bStop = h('button', { type: 'button', onclick: post('stop') }, 'Stop');
  const nav = h('p', {}, h('a', { href: '#/' }, '← Daftar run'));

  app.replaceChildren(nav, h('h1', {}, 'Run'), head, h('p', {}, bPause, ' ', bResume, ' ', bStop), status, conn,
    h('h2', {}, 'Chat'), chat, msgForm, h('h2', {}, 'Aktivitas'), tools);
  chat.append(promptEl);
  promptEl.hidden = true;

  function renderRun() {
    const r = state.run;
    if (!r) return;
    const a = allowedActions(r.status, r.sessionId);
    bPause.disabled = !a.pause; bResume.disabled = !a.resume; bStop.disabled = !a.stop;
    msgBox.setEnabled(a.message);
    head.replaceChildren(h('p', {}, h('strong', {}, r.projectName), ` (${r.project})`));
    promptEl.replaceChildren(h('p', {}, h('strong', {}, 'Kamu ')), h('p', {}, r.prompt));
    promptEl.hidden = false;
    let s = `Status: ${statusText(r.status)}`;
    if (r.pending) s += `, ${r.pending} menunggu kamu`;
    if (r.reason) s += ` — ${r.reason}`;
    if (r.tokens) s += `. Token masuk ${r.tokens.input}, keluar ${r.tokens.output}`;
    status.textContent = s;
    document.title = `${statusText(r.status)} · Crew Control`;
    if (r.lastLog) status.append(h('pre', {}, r.lastLog));
  }

  function renderMessage(m) {
    const t = h('time', { datetime: m.createdAt }, fmtTime(m.createdAt));
    if (m.kind === 'question') return renderQuestion(m, t);
    if (m.kind === 'permission') return renderPermission(m, t);
    const who = { agent: 'Agent', owner: 'Kamu', system: 'Sistem' }[m.kind] ?? m.kind;
    const note = m.kind === 'owner' && m.state === 'queued' ? ' (menunggu Lanjut)' : m.sentOnResume ? ' (terkirim saat lanjut)' : '';
    return h('article', { 'data-kind': m.kind }, h('p', {}, h('strong', {}, `${who}${note} `), t), h('p', {}, m.text));
  }

  function renderQuestion(m, t) {
    const body = h('article', { 'data-kind': 'question' }, h('p', {}, h('strong', {}, 'Agent bertanya '), t));
    if (m.state !== 'pending') {
      body.append(...m.questions.map((q) => h('p', {}, q.question)), h('p', {}, describeAnswer(m) || `(${m.state})`));
      return body;
    }
    const picks = {}, typed = {};
    const submit = (btnBody) => act(() => api('POST', `/api/runs/${m.runId}/messages/${m.id}/answer`, btnBody));
    const single = m.questions.length === 1 && !m.questions[0].multiSelect;
    const form = h('form', {
      onsubmit: (e) => {
        e.preventDefault();
        const r = buildQuestionAnswer(m.questions, picks, typed);
        if (r.missing) return showError(`Jawab dulu: ${r.missing.join('; ')}`);
        showError(''); submit(r.answers);
      },
    });
    m.questions.forEach((q, qi) => {
      const group = h('fieldset', {}, h('legend', {}, q.header ? `${q.header}: ${q.question}` : q.question));
      const buttons = q.options.map((o) => {
        const b = h('button', {
          type: 'button', 'aria-pressed': 'false', title: o.description ?? null,
          onclick: () => {
            if (single) return submit({ kind: 'question', answers: { [q.question]: o.label } });
            const cur = picks[q.question] ?? [];
            picks[q.question] = q.multiSelect ? (cur.includes(o.label) ? cur.filter((x) => x !== o.label) : [...cur, o.label]) : [o.label];
            buttons.forEach((bb, i) => bb.setAttribute('aria-pressed', String((picks[q.question] ?? []).includes(q.options[i].label))));
          },
        }, o.label);
        return b;
      });
      group.append(...buttons.flatMap((b, i) => [b, q.options[i].description ? h('small', {}, ` ${q.options[i].description} `) : ' ']));
      const free = h('input', { type: 'text', id: `bebas-${m.id}-${qi}`, maxlength: 2000, oninput: (e) => { typed[q.question] = e.target.value; } });
      group.append(h('p', {}, h('label', { for: free.id }, 'Atau ketik jawaban sendiri '), free));
      form.append(group);
    });
    form.append(h('button', { type: 'submit' }, 'Kirim jawaban'));
    body.append(form);
    return body;
  }

  function renderPermission(m, t) {
    const tool = m.tool;
    const body = h('article', { 'data-kind': 'permission' }, h('p', {}, h('strong', {}, 'Izin diminta '), t),
      h('p', {}, `${tool?.name ?? ''}: ${tool?.summary ?? m.text}`), tool?.why ? h('p', {}, `Alasan ditanya: ${tool.why}`) : null);
    if (m.state !== 'pending') { body.append(h('p', {}, describeAnswer(m) || `(${m.state})`)); return body; }
    const reason = h('input', { type: 'text', id: `alasan-${m.id}`, maxlength: 1000 });
    const url = `/api/runs/${m.runId}/messages/${m.id}/answer`;
    body.append(
      h('p', {}, h('button', { type: 'button', onclick: () => act(() => api('POST', url, { kind: 'permission', decision: 'allow' })) }, 'Setujui')),
      h('p', {}, h('label', { for: reason.id }, 'Alasan penolakan (opsional) '), reason, ' ',
        h('button', { type: 'button', onclick: () => act(() => api('POST', url, { kind: 'permission', decision: 'deny', ...(reason.value.trim() ? { reason: reason.value } : {}) })) }, 'Tolak')));
    return body;
  }

  function onEvent(type, data) {
    state = applyEvent(state, type, data);
    if (type === 'run') renderRun();
    else if (type === 'message') {
      const el = renderMessage(data);
      const old = els.get(data.id);
      const nearBottom = innerHeight + scrollY >= document.body.scrollHeight - 150;
      if (old) old.replaceWith(el); else chat.append(el);
      els.set(data.id, el);
      if (nearBottom) scrollTo(0, document.body.scrollHeight);
    } else if (type === 'tool') {
      tools.append(h('li', {}, `${data.subagent ? '[subagent] ' : ''}${data.name}: ${data.summary} `, h('time', { datetime: data.at }, fmtTime(data.at))));
    }
  }

  // Tanpa GET awal: SSE memutar ulang semua event dari awal. Run tak dikenal -> server membalas 404 (EventSource gagal), kita cek manual.
  const es = new EventSource(`/api/runs/${id}/events`);
  for (const type of ['run', 'message', 'tool']) es.addEventListener(type, (e) => onEvent(type, JSON.parse(e.data)));
  es.onopen = () => { conn.textContent = 'Terhubung (live).'; };
  es.onerror = () => {
    conn.textContent = 'Koneksi live terputus, mencoba menyambung ulang…';
    if (!state.run) api('GET', `/api/runs/${id}`).catch((e) => { es.close(); conn.textContent = ''; showError(e.message); });
  };
  cleanup = () => es.close();
}

function route() {
  cleanup(); cleanup = () => {};
  showError('');
  document.title = 'Crew Control';
  const m = /^#\/run\/([\w-]+)$/.exec(location.hash);
  if (m) viewRun(m[1]); else viewHome();
}
addEventListener('hashchange', route);
route();
