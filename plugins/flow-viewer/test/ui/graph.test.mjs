// t16a (F2-1, F2-3, F2-4): grafik 12 agent (14 node) tanpa tumpang tindih, teks node >= 12 px efektif di 900 dan 1440,
// node diperbarui < 1 dtk saat event datang, crew bawaan Menunggu + panduan saat belum ada run, jumlah putaran.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/graph.test.mjs   (tanpa PW: import 'playwright')
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { start } from './mock-server.mjs';

const { chromium } = await (process.env.PW ? import(pathToFileURL(process.env.PW).href) : import('playwright'));
const here = path.dirname(fileURLToPath(import.meta.url));

let srv, browser;
test.before(async () => { srv = await start(0, 'n12'); browser = await chromium.launch(); });
test.after(async () => { await browser.close(); srv.srv.close(); });

async function open(w, h, scenario) {
  srv.set(scenario);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/?p=demo`);
  await page.waitForSelector('.node');
  return { page, errs };
}

// Ukuran teks efektif terkecil di dalam node (CSS px x skala kanvas), hanya elemen yang benar-benar tampil.
const measure = (page) => page.evaluate(() => {
  const scale = Number(document.querySelector('#canvas').dataset.scale);
  const rects = [...document.querySelectorAll('.node')].map((n) => { const r = n.getBoundingClientRect(); return { id: n.dataset.id, l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  let overlap = 0;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) overlap++;
  }
  let min = Infinity;
  for (const el of document.querySelectorAll('.node *')) {
    const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    if (own && el.getClientRects().length) min = Math.min(min, parseFloat(getComputedStyle(el).fontSize) * scale);
  }
  return { n: rects.length, overlap, min, scale, mode: document.querySelector('#canvas').dataset.mode };
});

for (const w of [1440, 900]) {
  test(`${w} px: 14 node (12 agent), tanpa tumpang tindih, teks node terkecil >= 12 px`, async () => {
    const { page, errs } = await open(w, 900, 'n12');
    const m = await measure(page);
    console.log(`# ${w} px:`, JSON.stringify(m));
    await page.screenshot({ path: path.join(here, `t16a-${w}.png`) });
    assert.equal(m.n, 14);
    assert.equal(m.overlap, 0);
    assert.ok(m.min >= 12, `teks terkecil ${m.min}`);
    assert.deepEqual(errs, []);
    await page.close();
  });
}

test('900 px, 20 agent (22 node): tetap tidak ada yang menimpa dan teks >= 12 px', async () => {
  const { page } = await open(900, 900, 'n20');
  const m = await measure(page);
  console.log('# 20 agent:', JSON.stringify(m));
  assert.equal(m.n, 22);
  assert.equal(m.overlap, 0);
  assert.ok(m.min >= 12, `teks terkecil ${m.min}`);
  await page.close();
});

test('event baru: node Backend berubah dari Berjalan ke Gagal < 1 dtk tanpa muat ulang', async () => {
  const { page } = await open(1440, 900, 'running');
  const be = page.locator('.node[data-id=be]');
  assert.match(await be.locator('.st').innerText(), /Berjalan/);
  await page.evaluate(() => { window.__marker = 1; });
  const ms = await page.evaluate(() => new Promise((ok) => {
    const t0 = performance.now(), st = document.querySelector('.node[data-id=be]');
    new MutationObserver((_, o) => { if (/Gagal/.test(st.textContent)) { o.disconnect(); ok(performance.now() - t0); } }).observe(st, { subtree: true, childList: true, characterData: true });
    fetch('/__set?name=failed');
  }));
  console.log('# pembaruan node:', Math.round(ms), 'ms');
  assert.ok(ms < 1000, `${ms} ms`);
  assert.equal(await page.evaluate(() => window.__marker), 1);
  await page.close();
});

test('belum ada run: crew bawaan semua Menunggu + teks panduan; hilang setelah ada run', async () => {
  const { page } = await open(1440, 900, 'empty');
  const sts = await page.locator('.node[data-id]:not([data-id^="__"]) .st').allInnerTexts();
  assert.ok(sts.length >= 10 && sts.every((t) => /Menunggu/.test(t)), sts.join('|'));
  assert.match(await page.locator('#empty').innerText(), /Belum ada run/);
  await page.evaluate(() => fetch('/__set?name=running'));
  await page.waitForSelector('#empty', { state: 'hidden' });
  await page.close();
});

test('agent yang jalan berkali-kali menampilkan jumlah putaran', async () => {
  const { page } = await open(1440, 900, 'n12');
  assert.match(await page.locator('.node[data-id=ext0] .n-meta2').innerText(), /Putaran 2/);
  assert.match(await page.locator('.node[data-id=ext0] .hit').getAttribute('aria-label'), /putaran 2/);
  await page.close();
});
