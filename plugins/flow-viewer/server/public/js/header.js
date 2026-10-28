// Header tunggal: agent berjalan, durasi, progres alur, beban token, kebutuhan perhatian, koneksi.
import { html, raw, patch, $ } from './dom.js';
import { fmtTok, fmtDur } from './format.js';
import { counts, progress, tokens, duration, longest, attentionItems, needsInput, phase } from './model.js';
import { colorOf } from './icons.js';

export function renderHeader(S, now = Date.now()) {
  const c = counts(S), items = attentionItems(S), ph = phase(S);
  const ran = c.running + c.input;
  const runD = c.names.length ? c.names.join(', ') : ph === 'finished' ? 'tidak ada yang berjalan' : 'belum ada yang berjalan';
  patch($('#hb-run'), html`<div class="k">Berjalan</div><div class="v"><b>${ran}</b> dari ${c.total} agent</div><div class="d" title="${runD}">${runD}</div>`);

  const dur = duration(S, now), lg = longest(S);
  patch($('#hb-dur'), html`<div class="k">Durasi</div><div class="v"><b>${dur == null ? '—' : fmtDur(dur)}</b></div><div class="d">${lg ? 'terlama: ' + lg.label + ' ' + fmtDur(lg.ms) : (S.finished ? 'run selesai' : 'sejak prompt')}</div>`);

  const pr = progress(S);
  const prLabel = pr.pct == null ? 'belum ada rencana' : pr.label;
  patch($('#hb-prog'), html`<div class="k">Progres alur</div><div class="v"><b>${pr.pct == null ? '—' : pr.pct + '%'}</b></div><div class="d" title="${prLabel}">${prLabel}</div><div class="bar2" style="margin-top:3px;height:5px"><i style="width:${pr.pct || 0}%;background:var(--acc)"></i></div>`);

  const tk = tokens(S);
  const top = tk.rows.slice(0, 4);
  const seg = tk.rows.filter((r) => r.pct > 0);
  const dl = tk.deltaPct == null ? '' : html`<span class="dl ${tk.deltaPct > 0 ? 'up' : ''}">${tk.deltaPct > 0 ? '▲ ' : '▼ '}${Math.abs(tk.deltaPct)}% vs run lalu</span>`;
  patch($('#tkov'), html`<div class="k">Beban token per agent</div>
    <div class="v"><b>${tk.eq == null ? '—' : fmtTok(tk.eq)}</b>setara input${tk.raw != null ? html`<span class="rawt"> · mentah ${fmtTok(tk.raw)}</span>` : ''}${dl}</div>
    <div class="bar2">${seg.map((r) => html`<i style="width:${r.pct}%;background:${colorOf(r.id)}" title="${r.label} ${r.pct}%"></i>`)}</div>
    <div class="lg">${tk.waiting ? 'menunggu data token dari hook…' : top.map((r) => html`<span><i style="background:${colorOf(r.id)}"></i>${r.label} ${r.pct}%</span>`)}</div>`);

  const need = $('#need');
  const ni = needsInput(items), fails = items.filter((a) => a.kind === 'failed');
  let cls = 'need', txt = '';
  if (ni.length) { cls += ' on'; txt = `${ni.length} butuh jawabanmu`; }
  else if (fails.length) { cls += ' on bad'; txt = `${fails.length} agent gagal`; }
  else if (S.finished && c.total && (c.done || ran === 0)) { cls += ' on ok'; txt = 'Selesai · ringkasan'; }
  if (need.className !== cls) need.className = cls;
  if (need.textContent !== txt) need.textContent = txt;
  need.dataset.kind = ni.length ? 'input' : fails.length ? 'failed' : S.finished ? 'done' : '';
}

export function setConn(open) {
  const el = $('#conn'); el.classList.toggle('off', !open);
  el.title = open ? 'Terhubung ke Claude Code' : 'Terputus dari server. Mencoba lagi…';
  const t = $('#conntx'); const v = open ? 'terhubung' : 'terputus'; if (t.textContent !== v) t.textContent = v;
}
