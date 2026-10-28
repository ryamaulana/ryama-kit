// Detail agent terpilih: Ringkasan, Aktivitas, File, Hasil. Data dari /detail?id=.
import { html } from '../dom.js';
import { fmtTok, fmtDur, fmtClock, eqOf } from '../format.js';
import { STATUS_TEXT, ROLE, metaOf, colorOf } from '../icons.js';
import { nodeStatus, mainStatus, MAIN, PROMPT, agentLabel, attentionItems } from '../model.js';
import { ctxLimit } from './token.js';

export const badge = () => ({ n: '' });
export function view(S, ctx) {
  const id = ctx.selId;
  if (!id || id === PROMPT) {
    if (id === PROMPT) return { title: 'Prompt kamu', sub: 'masukan yang memulai run', body: html`<div class="box"><div class="pre">${S.prompt || '(belum ada)'}</div></div>` };
    return { title: 'Agent terpilih', sub: '', body: html`<div class="sub">Klik sebuah agent di kanvas untuk melihat isi, aktivitas, file, dan hasilnya.</div>` };
  }
  const items = attentionItems(S);
  const st = id === MAIN ? mainStatus(S, items) : nodeStatus(S, id, items);
  const d = ctx.detail[id];
  const m = metaOf(id, S), tab = ctx.agentTab || 'ringkasan';
  const head = html`<div class="chs" style="margin:6px 0 0"><span class="ch ${st === 'done' ? 'ok' : st === 'running' ? 'acc' : st === 'failed' ? 'bad' : st === 'input' ? 'w' : ''}">${STATUS_TEXT[st]}</span>${d && d.node && d.node.model ? html`<span class="ch m">${d.node.model}</span>` : ''}</div>
    <div class="tabs" id="agtabs">${[['ringkasan', 'Ringkasan'], ['aktivitas', 'Aktivitas'], ['files', 'File'], ['hasil', 'Hasil']].map(([k, l]) => html`<button type="button" data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`)}</div>`;
  if (!d) return { title: m.label, sub: m.role || ROLE[id] || '', body: html`${head}<div class="sub">Memuat detail…</div>`, needs: 'detail' };
  const n = d.node || {}, u = n.usage;
  let body;
  if (tab === 'aktivitas') {
    const ev = (d.events || []).slice().reverse();
    body = ev.length ? html`${ev.map((e) => html`<div class="row rh" title="${e.summary}"><i class="dt" style="background:${e.status === 'error' ? 'var(--bad)' : e.status === 'pending' ? 'var(--acc)' : 'var(--ok)'}"></i><span class="p mono">${e.tool} · ${e.summary}</span><span class="r">${fmtClock(e.t)}${e.ms != null ? ' · ' + fmtDur(e.ms) : ''}</span></div>`)}` : html`<div class="sub">Belum ada aktivitas.</div>`;
  } else if (tab === 'files') {
    const fl = d.files || [];
    body = fl.length ? html`${fl.map((f) => html`<div class="row"><span class="p mono" title="${f.path}">${f.path}</span><span class="ch ${f.created ? 'ok' : ''}">${f.created ? 'baru' : 'diubah'}</span><span class="r">+${f.add || 0} −${f.del || 0}</span></div>`)}` : html`<div class="sub">Agent ini belum mengubah file.</div>`;
  } else if (tab === 'hasil') {
    body = d.result ? html`<div class="pre">${d.result}</div>` : html`<div class="sub">Belum ada hasil akhir dari agent ini.</div>`;
  } else {
    const lim = ctxLimit(u && u.model), pct = u && u.ctx ? Math.min(100, Math.round((u.ctx / lim) * 100)) : 0;
    body = html`<div class="box"><small>Peran</small>${n.desc || m.role || ROLE[id] || '—'}</div>
      ${d.task ? html`<div class="box"><small>Tugas</small>${d.task}</div>` : ''}
      <div class="grid2"><div class="box"><small>Token setara</small><b>${u ? fmtTok(eqOf(u)) : '—'}</b></div><div class="box"><small>Durasi</small><b>${n.ms ? fmtDur(n.ms) : '—'}</b></div></div>
      ${u ? html`<div class="hs">Konteks</div><div class="bar2" style="height:9px"><i style="width:${pct}%;background:var(--acc)"></i></div><div class="d2">${fmtTok(u.ctx)} dari ${fmtTok(lim)} · ${u.turns || 0} giliran</div>` : html`<div class="note">${d.usageNote || ''}</div>`}
      <div class="hs">Konfigurasi</div>
      <div class="kv"><span>Model</span><b>${n.model || '—'}${n.modelCheck === 'unverified' ? ' (belum diverifikasi)' : ''}</b></div>
      <div class="kv"><span>Effort</span><b>${n.effort || 'bawaan'}</b></div>
      <div class="kv"><span>Tool diizinkan</span><b>${n.toolsAllowed || '—'}</b></div>
      <div class="kv"><span>Skill terdaftar</span><b>${(n.skillsDef || []).join(', ') || '—'}</b></div>
      <div class="kv"><span>Skill dipanggil</span><b>${(n.skills || []).join(', ') || 'belum ada'}</b></div>
      <div class="kv"><span>Putaran</span><b>${n.count || 0}</b></div>`;
  }
  return { title: m.label, sub: m.role || ROLE[id] || '', body: html`${head}${body}`, needs: 'detail' };
}
