// Ringkasan run (modal). Dipakai untuk run berjalan/selesai dan run dari riwayat.
import { html } from './dom.js';
import { fmtTok, fmtDur, eqOf } from './format.js';
import { counts, tokens, duration, attentionItems, nodeStatus, crewIds } from './model.js';
import { STATUS_TEXT, metaOf, colorOf } from './icons.js';

export function summaryHtml(S, title = 'Run selesai') {
  const c = counts(S), tk = tokens(S), dur = duration(S), items = attentionItems(S);
  const fails = items.filter((a) => a.kind === 'failed');
  const ids = crewIds(S).filter((id) => (S.nodes[id] || {}).count > 0 || nodeStatus(S, id, items) !== 'idle');
  const rows = ids.map((id) => {
    const st = nodeStatus(S, id, items), n = S.nodes[id] || {};
    return html`<div class="row"><i class="dt" style="background:${colorOf(id)}"></i><span>${metaOf(id, S).label}</span><span class="ch ${st === 'done' ? 'ok' : st === 'failed' ? 'bad' : st === 'running' ? 'acc' : ''}">${STATUS_TEXT[st]}</span><span class="r">${n.ms ? fmtDur(n.ms) : '—'} · ${n.usage ? fmtTok(eqOf(n.usage)) : '—'}</span></div>`;
  });
  return html`<h2>${title}${c.done ? html`<span class="ch ok">✓ ${c.done} selesai</span>` : ''}${c.failed ? html`<span class="ch bad">${c.failed} gagal</span>` : ''}</h2>
    <div class="sub">${S.prompt || ''}</div>
    <div class="g3"><div class="box"><small>Durasi</small><b>${dur == null ? '—' : fmtDur(dur)}</b></div><div class="box"><small>Token setara</small><b>${tk.eq == null ? '—' : fmtTok(tk.eq)}</b></div><div class="box"><small>File diubah</small><b>${(S.fileList || []).length}</b></div></div>
    ${fails.length ? html`<div class="box q"><small>Perlu dilihat</small>${fails.map((f) => html`<div><b>${metaOf(f.agent, S).label}</b> · ${f.text}</div>`)}</div>` : ''}
    <div class="hs">Agent</div>${rows.length ? rows : html`<div class="sub">Belum ada agent yang berjalan.</div>`}
    <div class="chs" style="margin-top:14px"><button class="btn pri" type="button" data-act="mclose">Tutup</button></div>`;
}
