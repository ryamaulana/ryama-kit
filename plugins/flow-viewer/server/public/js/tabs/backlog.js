// Tab Backlog SEMENTARA (data 1.7.1: S.backlog) sampai t34b memasang bagian per irisan dan baris jawaban.
import { html } from '../dom.js';

const LABEL = { running: 'berjalan', ready: 'siap', failed: 'gagal', waiting: 'menunggu', done: 'selesai', parked: 'diparkir' };
const DONE_SHOWN = 3;

export function backlogView(S) {
  const B = S && S.backlog;
  if (!B || !B.total) return html`<p class="empty">Proyek ini belum punya backlog.</p>`;
  const live = (B.items || []).filter((i) => i.status !== 'rejected' && i.status !== 'parked');
  const byId = new Map((B.items || []).map((i) => [i.id, i]));
  const own = (i) => i.owner && ['ready', 'waiting', 'running'].includes(i.status);
  const state = (i) => {
    if (own(i)) return 'perlu keputusan';
    const dep = i.status === 'waiting' && !i.owner && i.needs && i.needs.length ? byId.get(i.needs[0]) : null;
    return dep ? `menunggu ${dep.title}` : LABEL[i.status];
  };
  const row = (i) => html`<li><span class="bl-id">${i.title}</span><span class="tag">${state(i)}</span></li>`;
  const decide = live.filter((i) => i.status === 'failed' || (i.owner && i.status !== 'done'));
  const rest = live.filter((i) => !decide.includes(i));
  const go = rest.filter((i) => i.status === 'running' || i.status === 'ready');
  const wait = rest.filter((i) => i.status === 'waiting');
  const done = rest.filter((i) => i.status === 'done');
  const group = (t, a, extra = '', n = a.length) => (a.length ? html`<section class="blk"><h4>${t} (${n})</h4><ul class="bl">${a.map(row)}</ul>${extra}</section>` : '');
  return html`<p><b>${B.pct}%</b> · ${B.done} dari ${B.total} item${B.project ? ' · ' + B.project : ''}</p>
${group('Perlu keputusanmu', decide)}${group('Berjalan dan siap', go)}${group('Menunggu giliran', wait)}${group('Ide dan nanti', (B.parked || []).map((i) => ({ ...i, status: 'parked' })))}${group('Selesai', done.slice(-DONE_SHOWN), done.length > DONE_SHOWN ? html`<p class="more">+${done.length - DONE_SHOWN} lainnya</p>` : '', done.length)}`;
}
