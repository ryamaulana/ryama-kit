'use strict';
// Item pemberitahuan (ARCHITECTURE 5.3). Fungsi murni: snapshot + backlog -> item; tanpa state, tanpa waktu sistem.
// Kunci stabil: `jenis:sumber:kejadian`; kunci yang sama tidak pernah jadi dua item.

const str = (v) => (typeof v === 'string' ? v : '');
const BACKLOG_OPEN = new Set(['ready', 'running', 'doing', 'in_progress']);

// in: { runId, phase, session, finishedAt, pendings[], nodes{id:node}, backlog[items] }
function attention(inp) {
  const { runId = 0, phase = 'idle', session = '', finishedAt = 0 } = inp || {};
  const out = [];

  for (const p of Array.isArray(inp && inp.pendings) ? inp.pendings : []) {
    if (!p || !str(p.key)) continue;
    const waiting = p.kind === 'waiting' || p.kind === 'question';
    // Notification "menunggu" saat finished dibuang agar Selesai tidak berbunyi dua kali.
    if (p.kind === 'waiting' && phase !== 'paused' && phase !== 'running') continue;
    if (!waiting && p.kind !== 'permission') continue;
    out.push({
      key: p.key, kind: p.kind === 'permission' ? 'permission' : 'question', agent: str(p.sender),
      text: str(p.text), options: Array.isArray(p.options) ? p.options.filter((o) => typeof o === 'string') : [], at: p.at || 0
    });
  }

  const nodes = (inp && inp.nodes) || {};
  for (const id of Object.keys(nodes)) {
    const n = nodes[id];
    if (!n || n.status !== 'failed') continue;
    out.push({
      key: `fail:${session}:${id}:${runId}.${n.count || 1}`, kind: 'failed', agent: id,
      text: str(n.failReason) || 'agent gagal', options: [], at: n.lastEventAt || 0
    });
  }

  for (const i of Array.isArray(inp && inp.backlog) ? inp.backlog : []) {
    if (!i || !str(i.id)) continue;
    if (i.status === 'failed') {
      out.push({ key: `fail:backlog:${i.id}`, kind: 'failed', agent: 'backlog', text: str(i.lastFailure) || str(i.title), options: [], at: 0 });
    } else if (str(i.checkpointQ) && BACKLOG_OPEN.has(i.status)) {
      out.push({ key: `dec:backlog:${i.id}`, kind: 'decision', agent: 'backlog', text: str(i.checkpointQ), options: [], at: 0 });
    }
  }

  if (phase === 'finished') {
    out.push({ key: `done:${session}:main:${runId}`, kind: 'done', agent: 'main', text: '', options: [], at: finishedAt });
  }

  const seen = new Set();
  return out.filter((x) => !seen.has(x.key) && seen.add(x.key)).sort((a, b) => b.at - a.at); // terbaru di atas; sort stabil
}

const INPUT = new Set(['question', 'permission', 'decision']);
// Agregat untuk /projects (6): hitungan per jenis + maks 5 item Butuh input/Gagal untuk notifikasi lintas proyek.
function summarize(items) {
  const list = Array.isArray(items) ? items : [];
  const attn = list.filter((i) => i && (INPUT.has(i.kind) || i.kind === 'failed'));
  return {
    input: list.filter((i) => i && INPUT.has(i.kind)).length, failed: list.filter((i) => i && i.kind === 'failed').length, done: list.filter((i) => i && i.kind === 'done').length,
    items: attn.slice(0, 5).map((i) => ({ key: i.key, kind: i.kind, text: i.text })),
  };
}

module.exports = { attention, summarize };
