// t14b: putus-sambung server -> bilah #offline (ikon + teks + "diperbarui HH.MM"), hilang saat tersambung; file:// tetap menampilkan bilah.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/live-conn.test.mjs   (tanpa PW: import 'playwright')
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const { chromium } = await (process.env.PW ? import(pathToFileURL(process.env.PW).href) : import('playwright'));
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'server', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

// Server tiruan yang bisa dimatikan dan dihidupkan lagi di port yang sama.
function mock() {
  const socks = new Set(), urls = [];
  let srv, port = 0;
  const make = () => {
    srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/stream') {
        urls.push(req.url);
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
        return res.write('data: {"project":{"id":"demo"},"live":true}\n\n');
      }
      const f = path.join(PUBLIC, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
      if (f.startsWith(PUBLIC) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
      res.writeHead(404); res.end();
    });
    srv.on('connection', (s) => { socks.add(s); s.on('close', () => socks.delete(s)); });
    return new Promise((ok) => srv.listen(port, '127.0.0.1', () => { port = srv.address().port; ok(); }));
  };
  return {
    up: make, urls, get port() { return port; },
    down: () => new Promise((ok) => { srv.close(ok); for (const s of socks) s.destroy(); }),
  };
}

test('putus-sambung server: bilah muncul dengan jam pembaruan, hilang saat tersambung, ?p= dipakai', async () => {
  const m = mock(); await m.up();
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${m.port}/?p=demo`);
  await p.waitForSelector('#connt:text("terhubung")');
  assert.equal(await p.locator('#offline').isVisible(), false);
  assert.deepEqual(m.urls, ['/stream?p=demo']);

  const before = new Date();
  await m.down();
  await p.waitForSelector('#connt:text("terputus")');
  const bar = p.locator('#offline');
  assert.equal(await bar.isVisible(), true);
  assert.equal(await bar.locator('svg[aria-hidden=true]').count(), 1, 'ikon');
  const txt = await bar.innerText();
  assert.match(txt, /Terputus dari server.*diperbarui \d\d\.\d\d$/);
  const hm = txt.match(/(\d\d)\.(\d\d)$/);
  const ok = [before, new Date()].map((d) => String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0'));
  assert.ok(ok.includes(hm[0]), `jam ${hm[0]} bukan ${ok}`);
  await p.screenshot({ path: path.join(process.env.SHOTS || '.', 't14b-terputus.png') });

  await m.up();
  await p.waitForSelector('#connt:text("terhubung")', { timeout: 20000 });
  assert.equal(await p.locator('#offline').isVisible(), false);
  assert.deepEqual(errs, []);
  await b.close(); await m.down();
});

test('Daftar proyek memakai /stream?list=1', async () => {
  const m = mock(); await m.up();
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.route('**/projects', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"latest":null,"projects":[],"inactive":[]}' }));
  await p.goto(`http://127.0.0.1:${m.port}/`);
  await p.waitForSelector('#connt:text("terhubung")');
  assert.ok(m.urls.includes('/stream?list=1'));
  await b.close(); await m.down();
});

test('file://: modul ES tidak termuat, bilah #offline tetap terlihat', async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(pathToFileURL(path.join(PUBLIC, 'index.html')).href);
  await p.waitForTimeout(500);
  assert.equal(await p.locator('#offline').isVisible(), true);
  assert.match(await p.locator('#offline').innerText(), /Terputus dari server/);
  await b.close();
});
