// Laporan token per proyek dari riwayat run: dibaca pemilik di viewer (JSON) dan oleh AI (markdown).
// Masukan: daftar run { id, project, title, flow, prompt, started_at, updated_at, state, convo } (state/convo sudah di-parse).
'use strict';
const fs = require('fs');
const path = require('path');
const { eqOf } = require('./tokens');

const MAX_RUNS = 200; // PRD data model: maks 200 run per proyek

const MAIN = '__main';
const M = (x) => (x == null ? '-' : x >= 1e6 ? (x / 1e6).toFixed(1) + ' jt' : x >= 1e3 ? Math.round(x / 1e3) + 'k' : String(x));
const D = (ms) => { if (ms == null) return '-'; const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}j ${m % 60}m` : `${m}m`; };
const T = (t) => (t ? new Date(t).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '-');
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '/').replace(/</g, '‹').replace(/>/g, '›').replace(/\s+/g, ' '); // isi run hanya data: tanda HTML dinetralkan
const rawOf = (u) => (u ? (u.in || 0) + (u.out || 0) + (u.cr || 0) + (u.cc || 0) : 0);

function union(iv) {
  iv = iv.filter(([a, b]) => a && b && b > a).sort((x, y) => x[0] - y[0]);
  let tot = 0, cs = null, ce = null;
  for (const [a, b] of iv) { if (cs === null) { cs = a; ce = b; } else if (a <= ce) ce = Math.max(ce, b); else { tot += ce - cs; cs = a; ce = b; } }
  return cs === null ? 0 : tot + ce - cs;
}

// Kerja = gabungan waktu sesi utama aktif dan agent berjalan. Limit = dari pesan limit sampai prompt berikutnya. Sisanya menunggu pemilik.
function timeSplit(st, convo, end) {
  const iv = [];
  for (const n of Object.values(st.nodes || {})) for (const g of n.segments || []) iv.push([g.s, g.e || end]);
  if (Array.isArray(st.mainSegs) && st.mainSegs.length) for (const g of st.mainSegs) iv.push([g.s, g.e || end]);
  else { // run lama: perkiraan dari percakapan (pesan masuk -> jawaban Claude berikutnya)
    const c = convo || [];
    for (let i = 0; i < c.length; i++) if (/^(user|answer|notify)$/.test(c[i].kind)) { const nx = c.slice(i + 1).find((x) => /^(claude|question)$/.test(x.kind)); if (nx) iv.push([c[i].t, nx.t]); }
  }
  const work = union(iv);
  const starts = [...(st.mainSegs || []).map((g) => g.s), ...(convo || []).filter((x) => x.kind === 'user').map((x) => x.t)].sort((a, b) => a - b);
  let limit = 0;
  const lim = ((st.main && st.main.tokens && st.main.tokens.limits) || []).map((x) => x.t).filter(Boolean).sort((a, b) => a - b);
  for (let i = 0; i < lim.length; i++) { const nx = starts.find((s) => s > lim[i]); const stop = Math.min(nx || end, lim[i + 1] || Infinity); if (stop > lim[i]) limit += stop - lim[i]; }
  const wall = Math.max(0, end - st.startedAt);
  return { wall, work: Math.min(work, wall), limit: Math.min(limit, wall), wait: Math.max(0, wall - Math.min(work, wall) - limit), limitHits: lim.length };
}

function build(runs, project) {
  const seenInv = new Set(); // agent yang masih jalan saat run berikutnya mulai terekam di dua run: hitung sekali, di run tempat ia mulai
  const all = [...runs].sort((a, b) => a.started_at - b.started_at), used = all.slice(-MAX_RUNS);
  const out = { project, limit: { max: MAX_RUNS, total: all.length, shown: used.length, omitted: all.length - used.length }, mainEq: 0, generatedAt: Date.now(), runs: [], agents: {}, items: [], main: { coldN: 0, coldTok: 0, cold: [], handbacks: { n: 0, sumChars: 0, max: 0, top: [] }, heavy: [] }, heavy: [], byModel: {}, totals: { raw: 0, eq: 0, wall: 0, work: 0, wait: 0, limit: 0, limitHits: 0 }, missing: 0 };
  for (const r of used) {
    const st = r.state || {}, end = r.updated_at || st.updatedAt || Date.now();
    const ts = timeSplit(st, r.convo, end);
    const nodes = Object.entries(st.nodes || {});
    let raw = rawOf(st.main && st.main.usage), eq = eqOf(st.main && st.main.usage);
    out.mainEq += eq;
    const byModel = {};
    const addModel = (bm) => { for (const [k, v] of Object.entries(bm || {})) { byModel[k] = (byModel[k] || 0) + v; out.byModel[k] = (out.byModel[k] || 0) + v; } };
    const mt = st.main && st.main.tokens;
    if (mt) addModel(mt.byModel); else if (st.main && st.main.usage) addModel({ [String(st.main.usage.model || '?').replace(/^claude-/, '')]: raw });
    let analysed = !!mt;
    for (let [id, n] of nodes) {
      if (!n.usage) continue;
      const fresh = (n.invocations || []).filter((v) => !v.agentId || !seenInv.has(v.agentId));
      for (const v of fresh) if (v.agentId) seenInv.add(v.agentId);
      if ((n.invocations || []).length) { if (!fresh.length) continue; n = { ...n, invocations: fresh, usage: { ...n.usage, ...fresh.reduce((s, v) => ({ in: s.in + (v.in || 0), out: s.out + (v.out || 0), cr: s.cr + (v.cr || 0), cc: s.cc + (v.cc || 0), turns: s.turns + (v.turns || 0) }), { in: 0, out: 0, cr: 0, cc: 0, turns: 0 }) } }; }
      raw += rawOf(n.usage); eq += eqOf(n.usage);
      const a = out.agents[id] || (out.agents[id] = { calls: 0, turns: 0, raw: 0, eq: 0, ctxPeakSum: 0, models: {}, imgs: 0, outTok: {} });
      a.raw += rawOf(n.usage); a.eq += eqOf(n.usage); a.imgs += n.usage.imgReads || 0;
      const inv = n.invocations || [];
      if (inv.length) {
        analysed = true;
        for (const v of inv) {
          a.calls++; a.turns += v.turns; a.ctxPeakSum += v.ctxPeak;
          for (const [k, x] of Object.entries(v.byModel || {})) a.models[k] = (a.models[k] || 0) + x;
          for (const [k, x] of Object.entries(v.outTok || {})) a.outTok[k] = (a.outTok[k] || 0) + x;
          addModel(v.byModel);
          out.items.push({ run: r.id, agent: id, item: v.item || '', task: v.item ? '' : (v.prompt || '').slice(0, 60), model: v.model, turns: v.turns, ctxFirst: v.ctxFirst, ctxPeak: v.ctxPeak, raw: v.raw, eq: v.eq, coldTok: v.coldTok || 0, heavy: (v.heavy || [])[0] || null, t0: v.t0, t1: v.t1 });
          for (const h of v.heavy || []) out.heavy.push({ agent: id, item: v.item || '', ...h });
        }
      } else { a.calls += n.count || 0; a.turns += n.usage.turns || 0; a.ctxPeakSum += (n.usage.ctx || 0) * (n.count || 0); const k = String(n.usage.model || '?').replace(/^claude-/, ''); a.models[k] = (a.models[k] || 0) + rawOf(n.usage); addModel({ [k]: rawOf(n.usage) }); }
    }
    if (mt) {
      out.main.coldN += (mt.cold || []).length; out.main.coldTok += mt.coldTok || 0;
      for (const c of mt.cold || []) out.main.cold.push({ run: r.id, ...c });
      const hb = mt.handbacks || {};
      out.main.handbacks.n += hb.n || 0; out.main.handbacks.sumChars += (hb.avg || 0) * (hb.n || 0); out.main.handbacks.max = Math.max(out.main.handbacks.max, hb.max || 0);
      for (const h of hb.top || []) out.main.handbacks.top.push(h);
      for (const h of mt.heavy || []) out.main.heavy.push(h);
    }
    if (!analysed) out.missing++;
    const bl = st.backlog || null;
    out.runs.push({ id: r.id, title: r.title || st.title || st.flow, prompt: (r.prompt || st.prompt || '').slice(0, 80), start: st.startedAt || r.started_at, ...ts, raw, eq, byModel, analysed, mainCtx: st.main && st.main.usage ? st.main.usage.ctx : 0, mainTurns: st.main && st.main.usage ? st.main.usage.turns : 0, backlogDone: bl ? bl.done : null, backlogTotal: bl ? bl.total : null });
    Object.assign(out.totals, { raw: out.totals.raw + raw, eq: out.totals.eq + eq, wall: out.totals.wall + ts.wall, work: out.totals.work + ts.work, wait: out.totals.wait + ts.wait, limit: out.totals.limit + ts.limit, limitHits: out.totals.limitHits + ts.limitHits });
  }
  // Item selesai per run = selisih backlog terhadap run sebelumnya (backlog disimpan sebagai snapshot terakhir run).
  let prev = null;
  for (const r of out.runs) { r.itemsDone = r.backlogDone == null ? null : prev == null ? r.backlogDone : Math.max(0, r.backlogDone - prev); if (r.backlogDone != null) prev = r.backlogDone; r.eqPerItem = r.itemsDone ? Math.round(r.eq / r.itemsDone) : null; }
  // Tiga penyumbang setara terbesar (agent, atau sesi utama); persen dari setara total, rumus sama dengan pita dan Riwayat.
  const cands = Object.entries(out.agents).map(([id, a]) => ({ kind: 'agent', name: id, eq: a.eq }));
  if (out.mainEq) cands.push({ kind: 'orkestrator', name: 'orkestrator (sesi utama)', eq: out.mainEq });
  out.top = cands.sort((a, b) => b.eq - a.eq).slice(0, 3).map((c) => {
    const it = out.items.filter((i) => i.agent === c.name).sort((a, b) => (b.eq || 0) - (a.eq || 0))[0];
    return { ...c, pct: out.totals.eq ? Math.round((c.eq / out.totals.eq) * 100) : 0, topItem: it && it.item ? { item: it.item, eq: it.eq || 0 } : null };
  });
  out.items.sort((a, b) => b.raw - a.raw);
  out.heavy.sort((a, b) => b.tok - a.tok); out.heavy = out.heavy.slice(0, 15);
  out.main.cold.sort((a, b) => b.cc - a.cc); out.main.cold = out.main.cold.slice(0, 10);
  out.main.handbacks.top.sort((a, b) => b.chars - a.chars); out.main.handbacks.top = out.main.handbacks.top.slice(0, 5);
  out.main.handbacks.avg = out.main.handbacks.n ? Math.round(out.main.handbacks.sumChars / out.main.handbacks.n) : 0;
  out.main.heavy.sort((a, b) => b.tok - a.tok); out.main.heavy = out.main.heavy.slice(0, 8);
  return out;
}

function markdown(R) {
  const L = [];
  const tot = R.totals;
  L.push(`# Laporan token: ${R.project.split(/[\\/]/).pop()}`);
  L.push(`Proyek: ${R.project} · dibuat ${T(R.generatedAt)} oleh Flow Viewer · ${R.runs.length} run${R.missing ? ` · ${R.missing} run belum dianalisis per pemanggilan (pakai "Analisis ulang" di Riwayat)` : ''}`);
  const lim = R.limit || { max: MAX_RUNS, omitted: 0 };
  L.push(`Dasar: ${R.runs.length} run terbaru (maks ${lim.max})${lim.omitted ? `; ${lim.omitted} run lebih lama tidak ikut` : ''}.`);
  L.push('');
  L.push('## Penyumbang setara terbesar');
  for (const t of R.top || []) L.push(`- ${t.name}: ${M(t.eq)} setara, ${t.pct}% dari total setara ${M(tot.eq)}${t.topItem ? ` (item termahal: ${cell(t.topItem.item)} ${M(t.topItem.eq)})` : ''}`);
  if (!(R.top || []).length) L.push('- (belum ada data)');
  if (R.missing) L.push(`- ${R.missing} run belum dianalisis per pemanggilan; persen di atas bisa bergeser setelah "Analisis ulang".`);
  L.push('');
  L.push('Definisi: mentah = input + output + cache baca + cache tulis. Setara = input + 1,25 x cache tulis + 0,1 x cache baca + 5 x output (bobot harga, sama untuk semua model). Biaya satu giliran kurang lebih = seluruh konteks yang dibaca ulang, jadi giliran x konteks adalah pendorong utama. Ukuran output tool = perkiraan (karakter/4, gambar ~1.600).');
  L.push('');
  L.push(`## Ringkasan`);
  L.push(`- Token mentah ${M(tot.raw)}, setara ${M(tot.eq)}. Per model (mentah): ${Object.entries(R.byModel).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${M(v)}`).join(', ') || '-'}.`);
  L.push(`- Waktu: total ${D(tot.wall)} = kerja ${D(tot.work)} + menunggu pemilik ${D(tot.wait)} + limit ${D(tot.limit)} (${tot.limitHits} kali kena limit).`);
  L.push(`- Orkestrator: cache ditulis ulang ${R.main.coldN} kali (${M(R.main.coldTok)} token tulis), laporan subagent masuk ${R.main.handbacks.n} kali, rata-rata ${R.main.handbacks.avg} karakter, terpanjang ${R.main.handbacks.max}.`);
  L.push('');
  L.push('## Per run');
  L.push('| Run | Mulai | Total | Kerja | Nunggu | Limit | Mentah | Setara | Item selesai | Setara/item | Konteks utama akhir | Dianalisis |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of R.runs) L.push(`| ${cell(r.title)} · ${cell(r.prompt.slice(0, 30))} | ${T(r.start)} | ${D(r.wall)} | ${D(r.work)} | ${D(r.wait)} | ${D(r.limit)} | ${M(r.raw)} | ${M(r.eq)} | ${r.itemsDone == null ? '-' : r.itemsDone} | ${M(r.eqPerItem)} | ${M(r.mainCtx)} / ${r.mainTurns} giliran | ${r.analysed ? 'ya' : 'tidak'} |`);
  L.push('');
  L.push('## Per agent (semua run)');
  L.push('| Agent | Pemanggilan | Giliran | Giliran/panggil | Konteks puncak rata-rata | Mentah | % setara | Setara | Model (mentah) | Gambar | Output tool terbesar |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  const ag = Object.entries(R.agents).sort((a, b) => b[1].raw - a[1].raw);
  for (const [id, a] of ag) {
    const ot = Object.entries(a.outTok).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, v]) => `${k} ${M(v)}`).join(', ');
    L.push(`| ${id} | ${a.calls} | ${a.turns} | ${a.calls ? Math.round(a.turns / a.calls) : '-'} | ${a.calls ? M(Math.round(a.ctxPeakSum / a.calls)) : '-'} | ${M(a.raw)} | ${tot.eq ? Math.round((a.eq / tot.eq) * 100) : 0}% | ${M(a.eq)} | ${Object.entries(a.models).map(([k, v]) => `${k} ${M(v)}`).join(', ')} | ${a.imgs} | ${ot || '-'} |`);
  }
  L.push('');
  L.push('## Pemanggilan termahal (per item backlog)');
  L.push('| Item | Agent | Model | Giliran | Konteks awal -> puncak | Mentah | Setara | Cache tulis ulang | Output tool terbesar |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const v of R.items.slice(0, 25)) L.push(`| ${cell(v.item || '(' + v.task + ')')} | ${v.agent} | ${v.model || '-'} | ${v.turns} | ${M(v.ctxFirst)} -> ${M(v.ctxPeak)} | ${M(v.raw)} | ${M(v.eq)} | ${M(v.coldTok)} | ${v.heavy ? cell(`${v.heavy.tool} ${v.heavy.what}`.slice(0, 60)) + ' ' + M(v.heavy.tok) : '-'} |`);
  if (!R.items.length) L.push('| (belum ada data per pemanggilan) | | | | | | | | |');
  L.push('');
  L.push('## Orkestrator (sesi utama)');
  L.push(`Cache ditulis ulang (giliran yang menulis >= 60% konteksnya ke cache; biasanya setelah sesi menganggur dan cache kedaluwarsa):`);
  for (const c of R.main.cold) L.push(`- ${T(c.t)} · jeda ${c.gapMin == null ? '?' : c.gapMin + ' menit'} · ${M(c.cc)} token tulis`);
  if (!R.main.cold.length) L.push('- (tidak ada / belum dianalisis)');
  L.push('Laporan subagent terpanjang yang masuk konteks orkestrator:');
  for (const h of R.main.handbacks.top) L.push(`- ${cell(h.to)} · ${h.chars} karakter · ${T(h.t)}`);
  if (!R.main.handbacks.top.length) L.push('- (belum dianalisis)');
  L.push('Output tool terbesar di sesi utama:');
  for (const h of R.main.heavy) L.push(`- ${h.tool} ${cell(h.what)} · ~${M(h.tok)}`);
  if (!R.main.heavy.length) L.push('- (belum dianalisis)');
  L.push('');
  L.push('## Output tool terbesar (semua agent)');
  for (const h of R.heavy) L.push(`- ${h.agent}${h.item ? ' / ' + h.item : ''} · ${h.tool} ${cell(h.what)} · ~${M(h.tok)}`);
  if (!R.heavy.length) L.push('- (belum dianalisis)');
  L.push('');
  return L.join('\n');
}

// Salinan untuk AI. Dilewati (false) tanpa galat bila folder hilang, bukan folder, symlink, atau tak bisa ditulis.
function writeCopy(project, text) {
  try {
    if (!fs.statSync(project).isDirectory()) return false;
    // Symlink/junction: .flow-viewer dan file di dalamnya wajib tetap di dalam folder proyek asli.
    const dir = path.join(fs.realpathSync(project), '.flow-viewer');
    fs.mkdirSync(dir, { recursive: true });
    if (fs.realpathSync(dir) !== dir) return false;
    for (const [name, body] of [['.gitignore', '*\n'], ['laporan-token.md', text]]) {
      const f = path.join(dir, name);
      try { if (fs.lstatSync(f).isSymbolicLink()) return false; } catch (_) { /* belum ada */ }
      fs.writeFileSync(f, body);
    }
    return true;
  } catch (_) { return false; }
}

module.exports = { build, markdown, timeSplit, writeCopy, MAX_RUNS };
