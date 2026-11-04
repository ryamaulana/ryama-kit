// Server tiruan untuk uji UI: menyajikan server/public dan skenario data tetap. Tanpa dependensi.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', '..', 'server', 'public');
const demo = JSON.parse(fs.readFileSync(path.join(here, 'demo_state.json'), 'utf8'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const clone = (o) => JSON.parse(JSON.stringify(o));

export function scenario(name) {
  const S = clone(demo.S), D = clone(demo.D);
  const now = Date.now();
  S.startedAt = now - 5 * 60e3 - 43e3; S.updatedAt = now;
  const noOwner = () => { for (const i of (S.backlog.items || [])) i.owner = false; };
  if (name === 'running') return { S, D };
  if (name === 'failed') {
    S.pending = null; noOwner(); S.nodes.be.status = 'running'; S.nodes.be.failReason = '2 tes merah (auth.test.js:41)';
    return { S, D };
  }
  if (name === 'done') {
    S.finished = true; S.pending = null; noOwner();
    for (const n of Object.values(S.nodes)) { n.status = 'done'; n.count = Math.max(1, n.count); n.ms = n.ms || 90e3; }
    return { S, D };
  }
  if (name === 'empty') {
    S.prompt = ''; S.startedAt = null; S.pending = null; S.finished = false; S.main = { status: 'idle', tools: 0 }; S.fileList = []; S.log = []; S.skillCalls = []; S.backlog = null;
    for (const n of Object.values(S.nodes)) { n.status = 'idle'; n.count = 0; n.usage = null; n.ms = 0; n.last = ''; }
    return { S, D };
  }
  if (name === 'many') {
    for (let i = 0; i < 4; i++) {
      const id = 'ext' + i; S.crew.push(id); S.crewMeta.push({ id, col: 3, row: 4 + i, label: 'Agent Tambahan ' + (i + 1), role: 'Tambahan', icon: '_def' });
      S.nodes[id] = { id, status: i % 2 ? 'running' : 'done', count: 1, tools: 3, files: 0, skills: [], last: 'Read x.md', recent: [], startedAt: now - 3e4, usage: { in: 5000, out: 1000, cr: 100000, cc: 8000, turns: 3, model: 'claude-sonnet-5-5', ctx: 40000 } };
    }
    return { S, D };
  }
  if (name === 'n12' || name === 'n20') { // 12 / 20 agent; posisi seperti place() di server (kolom 2-3, baris berikutnya)
    const LB = { prd: 'Penulis PRD', ux: 'Perancang UX', architect: 'Arsitek', 'ui-designer': 'Perancang UI', be: 'Backend', fe: 'Frontend', 'ui-critic': 'Pengkritik UI', qa: 'Penguji QA', cyber: 'Keamanan', backlog: 'Pengatur Backlog' };
    for (const m of S.crewMeta) { m.label = LB[m.id] || m.id; m.role = 'Peran ' + m.label; }
    for (const n of Object.values(S.nodes)) if (n.status === 'running') n.startedAt = now - 40e3;
    const extra = name === 'n12' ? 2 : 10;
    for (let i = 0; i < extra; i++) {
      const id = 'ext' + i, col = 2 + (i % 2), row = 3 + Math.floor(i / 2);
      S.crew.push(id); S.crewMeta.push({ id, col, row, label: 'Agent Tambahan ' + (i + 1), role: 'Tambahan' });
      S.nodes[id] = { id, role: 'Tambahan', status: i % 3 === 0 ? 'running' : 'idle', count: i % 3 === 0 ? 2 : 0, last: i % 3 === 0 ? 'Read x.md' : '', startedAt: now - 3e4, ms: 20e3, usage: null, snippet: '' };
    }
    return { S, D };
  }
  throw new Error('skenario tidak dikenal: ' + name);
}

export function start(port = 0, initial = 'running') {
  let cur = initial, sc = scenario(cur); const clients = new Set();
  const push = () => { for (const c of clients) c.write(`data: ${JSON.stringify(sc.S)}\n\n`); };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), p = u.pathname;
    const json = (o, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (p === '/__set') { cur = u.searchParams.get('name'); sc = scenario(cur); push(); return json({ ok: 1 }); }
    if (p === '/stream') { res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }); res.write(`data: ${JSON.stringify(sc.S)}\n\n`); clients.add(res); req.on('close', () => clients.delete(res)); return; }
    if (p === '/state') return json(sc.S);
    if (p === '/health') return json({ ok: true });
    if (p === '/detail') {
      const id = u.searchParams.get('id');
      if (id === '__convo') return json({ id, convo: [{ t: Date.now() - 6e4, kind: 'user', text: sc.S.prompt }, { t: Date.now() - 3e4, kind: 'claude', text: 'Saya mulai dari PRD.' }, { t: Date.now() - 1e3, kind: 'question', text: sc.S.pending ? sc.S.pending.text : 'Lanjut?', agent: '' }], pending: sc.S.pending });
      return json(sc.D[id] || { id, node: sc.S.nodes[id] || {}, events: [], files: [], result: '' });
    }
    if (p === '/history') return json({ kind: 'file', current: '', liveId: sc.S.runId, rows: [{ id: sc.S.runId, project: 'demo', title: 'run sekarang', prompt: sc.S.prompt, started_at: sc.S.startedAt, updated_at: Date.now(), finished: 0, tokens_eq: 2e6, tokens_raw: 8e6, agents_ran: 4, files: 5 }, { id: 1, project: 'demo', title: 'run lama', prompt: 'x', started_at: Date.now() - 864e5, updated_at: Date.now() - 864e5 + 6e5, finished: 1, tokens_eq: 1.5e6, tokens_raw: 6e6, agents_ran: 6, files: 3 }] });
    if (p === '/history/get') return json({ id: 1, project: 'demo', state: sc.S, convo: [] });
    if (p === '/reset' && req.method === 'POST') { res.writeHead(204); return res.end(); }
    if (p === '/projects') { res.writeHead(404); return res.end('{}'); }
    const file = p === '/' ? 'index.html' : path.normalize(p).replace(/^([/\\]|\.\.)+/g, '');
    const full = path.join(PUBLIC, file);
    if (full.startsWith(PUBLIC) && fs.existsSync(full) && fs.statSync(full).isFile()) { res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); return fs.createReadStream(full).pipe(res); }
    res.writeHead(404); res.end('not found');
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ srv, port: srv.address().port, set: (n) => { cur = n; sc = scenario(n); push(); } })));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const s = await start(Number(process.env.PORT) || 4780, process.env.SCENARIO || 'running'); console.log('mock http://127.0.0.1:' + s.port); }
