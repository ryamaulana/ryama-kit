// Akses server: fetch JSON dan aliran SSE dengan sambung ulang. `p` (proyek) ditambahkan otomatis.
export const projectId = () => new URLSearchParams(location.search).get('p') || '';

export function qs(params = {}) {
  const u = new URLSearchParams();
  const p = projectId();
  if (p) u.set('p', p);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.set(k, v);
  const s = u.toString();
  return s ? '?' + s : '';
}

export async function getJSON(path, params) {
  const r = await fetch(path + qs(params), { cache: 'no-store' });
  if (!r.ok) throw Object.assign(new Error('http ' + r.status), { status: r.status });
  return r.json();
}
export async function post(path, params) {
  const r = await fetch(path + qs(params), { method: 'POST' });
  if (!r.ok && r.status !== 204) throw Object.assign(new Error('http ' + r.status), { status: r.status });
}

// Menyambung ke /stream. onStatus('open'|'closed'), onState(snapshot), onProjects(list).
export function connect({ onState, onProjects, onStatus }) {
  if (location.protocol === 'file:') { onStatus('closed'); return { close() {} }; }
  let es = null, timer = null, delay = 1000, closed = false;
  const open = () => {
    es = new EventSource('/stream' + qs());
    es.onopen = () => { delay = 1000; onStatus('open'); };
    es.onmessage = (e) => { try { onState(JSON.parse(e.data)); } catch (_) { /* paket rusak diabaikan */ } };
    es.addEventListener('projects', (e) => { try { onProjects && onProjects(JSON.parse(e.data)); } catch (_) { /* abaikan */ } });
    es.onerror = () => {
      onStatus('closed'); es.close();
      if (!closed) { timer = setTimeout(open, delay); delay = Math.min(delay * 2, 10000); }
    };
  };
  open();
  return { close() { closed = true; clearTimeout(timer); if (es) es.close(); } };
}
