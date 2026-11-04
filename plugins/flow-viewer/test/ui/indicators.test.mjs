// t17 (F3): tiga indikator di pita menempel: isi per keadaan, angka pembanding tidak patah baris, pita tetap terlihat
// saat panel digulung, detail terbuka, dan halaman digulung; jalan pintas ke tab.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/indicators.test.mjs   (tanpa PW: import 'playwright')
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

let snap = {};
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
    return res.write(`data: ${JSON.stringify(snap)}\n\n`);
  }
  const f = path.join(PUBLIC, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
  if (f.startsWith(PUBLIC) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
  res.writeHead(404); res.end();
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${srv.address().port}/?p=demo`;
const b = await chromium.launch();
test.after(async () => { await b.close(); srv.close(); });

async function open(S, { w = 1440, h = 900 } = {}) {
  snap = { ...S, live: true, project: { id: 'demo', name: 'demo' } };
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(base);
  await p.waitForSelector('#now .k-big');
  return p;
}
const txt = (p, sel) => p.locator(sel).innerText();
const box = (p) => p.locator('#strip').boundingBox();

test('menunggu pertanyaan: tiga sel terisi, selisih netral dengan pembanding tidak patah baris', async () => {
  const { S } = scenario('running');
  Object.assign(S, {
    progress: { pct: 60, label: 'Backlog 12 dari 20 item' }, backlog: { ...(S.backlog || {}), total: 20, done: 12, items: S.backlog ? S.backlog.items : [] },
    tokens: { eq: 184200, prevEq: 164000, deltaPct: 12, boros: false },
    attention: [{ key: 'q1', kind: 'question', agent: '__main', text: S.pending.text, options: [], at: 1 }],
  });
  for (const n of Object.values(S.nodes)) if (n.status === 'running') n.last = 'Menyusun kartu skor';
  const p = await open(S);
  assert.match(await txt(p, '#now'), /Menunggu kamu: jawab pertanyaan/);
  assert.match(await txt(p, '#now'), /Menyusun kartu skor/);
  assert.match(await txt(p, '#prog'), /60%[\s\S]*Backlog 12 dari 20 item[\s\S]*Durasi \d+ mnt/);
  assert.match(await txt(p, '#tok'), /184 rb[\s\S]*setara input[\s\S]*\+12% dari run sebelumnya \(164 rb\)/);
  assert.equal(await p.locator('#tok .pill').count(), 0, 'tanpa Boros');
  assert.equal(await p.locator('#prog [role=img]').getAttribute('aria-label'), 'Progres 60 persen');
  const ws = await p.locator('#tok .delta span').evaluate((e) => getComputedStyle(e).whiteSpace);
  assert.equal(ws, 'nowrap');
  assert.deepEqual(p.errs, []);
  await p.screenshot({ path: path.join(SHOTS, 't17-1440.png') });
  await p.close();
});

test('di 900 px pita tiga sel tanpa scroll horizontal dan angka pembanding tetap satu baris', async () => {
  const { S } = scenario('running');
  Object.assign(S, { progress: { pct: 60, label: 'Backlog 12 dari 20 item' }, tokens: { eq: 1_840_200, prevEq: 1_640_000, deltaPct: 12, boros: true }, attention: [] });
  const p = await open(S, { w: 900, h: 780 });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const h = await p.locator('#tok .delta span').evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e); return [r.getClientRects().length, e.getBoundingClientRect().height]; });
  assert.equal(h[0], 1, 'angka pembanding satu baris');
  assert.match(await txt(p, '#tok'), /Boros/);
  assert.equal(await p.locator('#tok .pill svg[aria-hidden=true]').count(), 1, 'Boros: ikon + teks');
  await p.screenshot({ path: path.join(SHOTS, 't17-900.png') });
  await p.close();
});

test('gagal: "Agent be berhenti di putaran 2."; tanpa agent berjalan: teks tetap + status sesi; "-" dan "menunggu data"', async () => {
  let { S } = scenario('running');
  S.nodes.be = { ...S.nodes.be, status: 'failed', count: 2, failReason: '2 tes merah' };
  S.pending = null; S.attention = []; S.progress = { pct: null, label: '' }; S.tokens = { eq: null, prevEq: null, deltaPct: null, boros: false };
  let p = await open(S);
  assert.match(await txt(p, '#now'), /Agent be berhenti di putaran 2\./);
  assert.match(await txt(p, '#now'), /2 tes merah/);
  assert.match(await txt(p, '#prog'), /^-/m);
  assert.match(await txt(p, '#tok'), /menunggu data/);
  assert.doesNotMatch(await txt(p, '#tok'), /^0$/m);
  await p.close();

  ({ S } = scenario('done'));
  S.attention = []; S.backlog = null; S.progress = { pct: 100, label: 'Langkah wajib 5 dari 5' }; S.tokens = { eq: 90000, prevEq: null, deltaPct: null, boros: false };
  p = await open(S);
  assert.match(await txt(p, '#now'), /Tidak ada agent yang berjalan\./);
  assert.match(await txt(p, '#now'), /Sesi utama: Selesai/);
  assert.equal(await p.locator('#tok .delta').count(), 0, 'tanpa pembanding tidak ada selisih');
  assert.equal(await p.locator('#prog .lnk').count(), 0, 'tanpa backlog tidak ada jalan pintas backlog');
  await p.close();
});

test('pita tetap terlihat saat panel digulung, detail terbuka, dan halaman digulung', async () => {
  const { S } = scenario('running');
  Object.assign(S, { progress: { pct: 60, label: 'Backlog 12 dari 20 item' }, tokens: { eq: 184200, prevEq: 164000, deltaPct: 12, boros: false }, attention: [] });
  const p = await open(S, { h: 780 });
  const before = await box(p);
  assert.ok(before.y >= 0 && before.y + before.height <= 780);
  // detail terbuka dengan isi panjang, digulung di semua kontainer yang mungkin
  await p.evaluate(() => {
    const d = document.querySelector('#drawer'); d.hidden = false;
    document.querySelector('#dsecs').innerHTML = '<p style="height:4000px">isi panjang</p>';
    for (const s of ['#side', '#pan', '#drawer']) { const e = document.querySelector(s); e.scrollTop = 3000; }
    window.scrollTo(0, 3000);
  });
  const mid = await box(p);
  assert.deepEqual([mid.y, mid.height], [before.y, before.height], 'pita tidak bergeser oleh gulir panel');
  // halaman tidak menggulung dan pita bukan anak wadah yang menggulung; sticky menjaganya bila tata letak berubah
  const anc = await p.locator('#strip').evaluate((e) => { const o = []; for (let n = e.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) o.push(getComputedStyle(n).overflow); return o; });
  assert.deepEqual(anc.filter((o) => o !== 'visible'), [], 'pita di dalam wadah yang menggulung');
  assert.equal(await p.evaluate(() => document.documentElement.scrollTop + document.body.scrollTop), 0, 'halaman tidak menggulung');
  assert.equal(await p.locator('#strip').evaluate((e) => getComputedStyle(e).position), 'sticky');
  await p.screenshot({ path: path.join(SHOTS, 't17-menempel.png') });
  await p.close();
});

test('jalan pintas: Lihat token dan Lihat backlog menekan tombol rel; nama agent menekan node-nya', async () => {
  const { S } = scenario('running');
  Object.assign(S, { progress: { pct: 60, label: 'Backlog 12 dari 20 item' }, backlog: { total: 20, done: 12, items: [] }, tokens: { eq: 184200, prevEq: 164000, deltaPct: 12, boros: false }, attention: [] });
  for (const n of Object.values(S.nodes)) if (n.status === 'running') n.last = 'Edit a.js';
  const p = await open(S);
  await p.evaluate(() => { window.__hits = []; document.querySelector('#rail').addEventListener('click', (e) => window.__hits.push(e.target.dataset.v)); document.addEventListener('fv-pick', (e) => window.__hits.push('pick:' + e.detail.id)); });
  await p.click('#tok [data-show=token]');
  await p.click('#prog [data-show=backlog]');
  await p.waitForSelector('#now [data-select]');
  const id = await p.locator('#now [data-select]').first().getAttribute('data-select');
  await p.click('#now [data-select]');
  assert.deepEqual(await p.evaluate(() => window.__hits), ['token', 'backlog', 'pick:' + id]);
  assert.equal(await p.locator(`.node[data-id="${id}"].sel`).count(), 1, 'node disorot');
  await p.close();
});
