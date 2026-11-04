// t20a (F5-2, F5-3, F5-5; DESIGN masalah #2 dan #8): kotak Butuh input dan Gagal di Live.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/alerts.test.mjs   (tanpa PW: import 'playwright')
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { scenario } from './mock-server.mjs';

const { chromium } = await (process.env.PW ? import(pathToFileURL(process.env.PW).href) : import('playwright'));
const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', '..', 'server', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const SHOTS = process.env.SHOTS || here;

let snap = {}; const clients = new Set();
const push = () => { for (const r of clients) r.write(`data: ${JSON.stringify(snap)}\n\n`); };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
    clients.add(res); req.on('close', () => clients.delete(res));
    return res.write(`data: ${JSON.stringify(snap)}\n\n`);
  }
  const f = path.join(PUBLIC, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
  if (f.startsWith(PUBLIC) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
  res.writeHead(404); res.end();
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${srv.address().port}/?p=demo`;
const b = await chromium.launch();
test.after(async () => { await b.close(); srv.closeAllConnections?.(); srv.close(); });

const Q = 'Pakai tabel atau kartu untuk daftar proyek?';
const attn = (extra = []) => [
  { key: 'q1', kind: 'question', agent: '__main', text: Q, options: ['Tabel', 'Kartu', 'Keduanya'], at: 3000 },
  { key: 'dec:backlog:x', kind: 'decision', agent: 'backlog', text: 'Terima hasil replay? Pilih: (a) terima, notifikasi tetap; (b) ketatkan, Selesai terlambat. (rekomendasi: terima)', options: [], at: 0 },
  { key: 'fail:s:be:1.2', kind: 'failed', agent: 'be', text: '2 tes merah (auth.test.js:41)', options: [], at: 2000 },
  ...extra,
];

async function open(attention, { w = 1440, h = 900 } = {}) {
  const { S } = scenario('running');
  snap = { ...S, attention, pending: null, live: true, project: { id: 'demo', name: 'demo' } };
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(base);
  await p.waitForSelector('#canvas .node');
  return p;
}
const txt = (p, sel) => p.locator(sel).innerText();
// Warna token -> rgb lewat elemen probe, supaya dibandingkan dengan nilai terhitung, bukan hex di CSS.
const tok = (p, name) => p.evaluate((n) => { const e = document.createElement('i'); e.style.color = `var(${n})`; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c; }, name);

test('Butuh input dan Gagal: judul, urutan, pilihan, node bertanda, garis 1 px, 28 px dan 24 px', async () => {
  const p = await open(attn());
  assert.equal(await p.locator('#alerts').isVisible(), true);
  assert.match(await txt(p, '#alerts h2'), /^Butuh input \(2\)$/);
  assert.equal(await txt(p, '#alerts .n-title'), Q, 'terbaru (at 3000) di atas');
  assert.deepEqual(await p.locator('#alerts .n-q .choices li').allInnerTexts(), ['Tabel', 'Kartu', 'Keduanya']);
  assert.match(await txt(p, '#alerts .n-hint'), /Jawab di aplikasi Claude\./);
  // keputusan backlog: pilihan tampil di Live (masalah #8)
  assert.match(await txt(p, '#alerts .n-sub'), /Backlog[\s\S]*Terima hasil replay\?/);
  assert.deepEqual(await p.locator('#alerts .n-sub .choices li').allInnerTexts(), ['terima, notifikasi tetap', 'ketatkan, Selesai terlambat']);
  assert.match(await txt(p, '#alerts .n-sub'), /Rekomendasi: terima\./);
  // kartu Gagal terpisah
  assert.match(await txt(p, '#alerts .n-f header'), /^Gagal · \S.* · \d\d\.\d\d$/);
  assert.match(await txt(p, '#alerts .n-f'), /2 tes merah/);
  // node terkait bertanda: sesi utama menunggu
  await p.waitForSelector('#canvas .node.n-input');
  assert.equal(await p.locator('#canvas .node.n-input').count() >= 1, true, 'node Butuh input bertanda');
  // masalah #2
  const m = await p.evaluate(() => {
    const cs = (s, pr) => getComputedStyle(document.querySelector(s))[pr];
    return { nb: cs('.notice', 'borderTopWidth'), nc: cs('.notice', 'borderTopColor'), fb: cs('.n-f', 'borderTopWidth'), fc: cs('.n-f', 'borderTopColor'), t: cs('.n-title', 'fontSize'), k: cs('#prog .k-num', 'fontSize') };
  });
  assert.deepEqual([m.nb, m.fb, m.t, m.k], ['1px', '1px', '28px', '24px']);
  assert.equal(m.nc, await tok(p, '--warn-line'));
  assert.equal(m.fc, await tok(p, '--bad-line'));
  assert.deepEqual(p.errs, []);
  await p.screenshot({ path: path.join(SHOTS, 't20a-1440.png') });
  await p.close();
});

test('maks 2 terbuka lalu "+N lainnya"; kunci ganda jadi satu; dijawab (item hilang) menutup kotak dan KPI kembali 44 px', async () => {
  const more = [{ key: 'q2', kind: 'permission', agent: 'be', text: 'Izinkan Bash?', options: [], at: 2500 }, { key: 'q1', kind: 'question', agent: '__main', text: 'duplikat', options: [], at: 9000 }];
  const p = await open(attn(more));
  assert.match(await txt(p, '#alerts h2'), /Butuh input \(3\)/, 'kunci q1 ganda dihitung sekali');
  assert.equal(await p.locator('#alerts .n-title, #alerts .n-sub b').count(), 2);
  assert.match(await txt(p, '#alerts .n-more'), /^\+1 lainnya$/);
  await p.click('#alerts [data-show=chat]');
  assert.equal(await p.locator('#rail [data-v=chat][aria-pressed=true]').count(), 1, 'Lihat percakapan membuka tab Percakapan');
  snap = { ...snap, attention: [] }; push();
  await p.waitForSelector('#alerts', { state: 'hidden' });
  assert.equal(await p.locator('#canvas .node.n-input').count(), 0, 'node tidak lagi bertanda');
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#prog .k-num')).fontSize), '44px');
  await p.close();
});

test('hanya Gagal di 900 px: kartu terpisah tanpa kotak Butuh input, tautan Lihat detail memilih node', async () => {
  const p = await open([{ key: 'f', kind: 'failed', agent: 'be', text: '2 tes merah', options: [], at: 5 }], { w: 900, h: 780 });
  assert.equal(await p.locator('#alerts .notice').count(), 0);
  assert.match(await txt(p, '#alerts .n-f header'), /^Gagal · /);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await p.screenshot({ path: path.join(SHOTS, 't20a-900.png') });
  await p.click('#alerts [data-select=be]');
  assert.equal(await p.locator('.node[data-id=be].sel').count(), 1);
  await p.close();
});
