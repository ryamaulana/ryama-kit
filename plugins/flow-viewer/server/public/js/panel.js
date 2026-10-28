// Rel ikon + panel yang terbuka saat ikon diklik. Isi panel berasal dari tabs/*.js.
import { html, raw, patch, $, $$ } from './dom.js';
import { RAIL_ICON } from './icons.js';
import * as chat from './tabs/chat.js';
import * as backlog from './tabs/backlog.js';
import * as files from './tabs/files.js';
import * as skill from './tabs/skill.js';
import * as token from './tabs/token.js';
import * as agent from './tabs/agent.js';
import * as log from './tabs/log.js';
import * as history from './history.js';

export const TABS = [
  ['chat', 'Chat', 'Percakapan dan pertanyaan (butuh jawabanmu)', chat],
  ['backlog', 'Backlog', 'Progres dan backlog', backlog],
  ['files', 'File', 'File diubah', files],
  ['skill', 'Skill', 'Skill yang dipanggil', skill],
  '-',
  ['token', 'Token', 'Beban token per agent', token],
  ['agent', 'Agent', 'Agent terpilih', agent],
  ['history', 'Riwayat', 'Riwayat run', history],
  ['log', 'Log', 'Log kejadian', log],
];
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const iconOf = { chat: 'chat', backlog: 'backlog', files: 'files', skill: 'skill', token: 'token', agent: 'agent', history: 'history', log: 'log' };

export function renderRail(S, ctx) {
  const h = TABS.map((t) => {
    if (t === '-') return '<span class="ln"></span>';
    const [k, lab, title, mod] = t;
    const b = k === 'history' ? mod.badge(ctx) : mod.badge(S);
    const n = b.n === '' || b.n == null ? '' : `<em class="${b.warn ? 'w' : ''}">${b.n}</em>`;
    return `<button type="button" data-v="${k}" class="${ctx.key === k ? 'on' : ''}" title="${title}" aria-label="${title}" aria-pressed="${ctx.key === k}">${svg(RAIL_ICON[iconOf[k]])}<span class="rl2">${lab}</span>${n}</button>`;
  }).join('');
  patch($('#rail'), raw(h));
}

export function renderPanel(S, ctx) {
  const pan = $('#pan'), side = $('#side');
  const open = !!ctx.key;
  pan.classList.toggle('open', open); side.classList.toggle('collapsed', !open);
  if (!open) return null;
  const mod = TABS.find((t) => t !== '-' && t[0] === ctx.key)[3];
  const v = mod.view(S, ctx);
  const scroll = $('#pi').scrollTop;
  const wrap = ctx.key === 'agent' ? `<div id="drawer">` : '';
  const out = html`${raw(wrap)}<h2>${v.title}<small>${v.sub || ''}</small><button type="button" data-act="pclose" aria-label="Tutup panel">×</button></h2>${v.body}${raw(wrap ? '</div>' : '')}`;
  if (patch($('#pi'), out)) $('#pi').scrollTop = scroll;
  return v.needs || null;
}
