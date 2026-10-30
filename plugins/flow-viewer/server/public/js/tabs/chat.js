import { html } from '../dom.js';
import { fmtClock } from '../format.js';
import { attentionItems, needsInput, agentLabel, MAIN } from '../model.js';

const WHO = { user: 'Kamu', claude: 'Claude', agent: 'Agent', question: 'Pertanyaan', answer: 'Jawaban', permission: 'Izin', error: 'Galat', notify: 'Sistem' };
export function badge(S) { const n = needsInput(attentionItems(S)).length; return { n: n || (S.convoN || ''), warn: n > 0 }; }
export function view(S, ctx) {
  const items = needsInput(attentionItems(S));
  const q = items.map((a) => html`<div class="box q" data-attn="${a.key}"><small>Butuh jawabanmu${a.at ? ' · ' + fmtClock(a.at) : ''}</small><b>${a.text}</b>
    ${(a.options || []).map((o) => html`<div class="opt">${typeof o === 'string' ? o : o.label}</div>`)}
    <div class="sub" style="margin:8px 0 0">Jawab di terminal Claude Code. Viewer hanya membaca.</div></div>`);
  const msgs = (ctx.convo || []).slice(S.__hist ? -300 : -80).map((m) => {
    const who = WHO[m.kind] || m.kind;
    const ag = m.agent ? ' · ' + agentLabel(m.agent, S) : '';
    if (m.kind === 'notify') return html`<div class="msg" style="color:var(--ink3)"><div class="w">${fmtClock(m.t)} · ${who}</div>${m.text}</div>`;
    return html`<div class="msg ${m.kind === 'user' ? 'u' : ''}"><div class="w">${fmtClock(m.t)} · ${who}${ag}</div><div class="t">${m.text}</div></div>`;
  });
  return { title: 'Percakapan', sub: 'cermin dari Claude Code, hanya baca', body: html`${q}${msgs.length ? msgs : html`<div class="sub">Belum ada percakapan di run ini.</div>`}`, needs: 'convo' };
}
