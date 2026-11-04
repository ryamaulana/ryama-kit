// t16b (F2-3, F4-2): zoom/pan/pas layar/Ctrl+scroll/klik dua kali, batas 74%, kontrol zoom tidak menutupi node, keyboard + seleksi.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/graph-zoom.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { start } from './mock-server.mjs';

const { chromium } = await (process.env.PW ? import(pathToFileURL(process.env.PW).href) : import('playwright'));
let srv, browser;
test.before(async () => { srv = await start(0, 'n12'); browser = await chromium.launch(); });
test.after(async () => { await browser.close(); srv.srv.close(); });

async function open(w, h, scenario = 'n12') {
  srv.set(scenario);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/?p=demo`);
  await page.waitForSelector('.node');
  return { page, errs };
}
const label = (page) => page.locator('#zlbl').innerText();
const num = async (page) => parseInt(await label(page), 10);
const minText = (page) => page.evaluate(() => {
  const scale = Number(document.querySelector('#canvas').dataset.scale);
  let min = Infinity;
  for (const el of document.querySelectorAll('.node *')) {
    if ([...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && el.getClientRects().length) min = Math.min(min, parseFloat(getComputedStyle(el).fontSize) * scale);
  }
  return min;
});
// Node yang terlihat (di dalam area gulir) dibandingkan dengan kotak kontrol zoom: tumpang tindih dan jarak vertikal terkecil.
const gap = (page) => page.evaluate(() => {
  const z = document.querySelector('#zwrap').getBoundingClientRect(), sc = document.querySelector('#gscroll').getBoundingClientRect();
  let min = Infinity, overlap = 0;
  for (const n of document.querySelectorAll('.node')) {
    const r = n.getBoundingClientRect();
    if (r.right < z.left || r.left > z.right || r.bottom < sc.top || r.top > sc.bottom) continue;
    const bottom = Math.min(r.bottom, sc.bottom);
    if (bottom > z.top && r.top < z.bottom) overlap++;
    min = Math.min(min, z.top - bottom);
  }
  return { min, overlap, strip: z.bottom - sc.bottom, ctrlH: z.height, scrollerBottomToWrap: document.querySelector('.stage-wrap').getBoundingClientRect().bottom - sc.bottom };
});

test('Perkecil sampai batas 74% (sama dengan Pas layar), teks node >= 12 px, tidak lebih kecil lagi', async () => {
  const { page, errs } = await open(900, 780);
  const fitLbl = await label(page);
  for (let i = 0; i < 8; i++) await page.click('#zout');
  assert.equal(await label(page), '74%');
  const t = await minText(page);
  assert.ok(t >= 12, `teks node ${t} px di zoom minimum`);
  await page.click('#zfit');
  assert.ok((await num(page)) >= 74, `Pas layar ${await label(page)} tidak di bawah 74%`);
  console.log('# 900x780: pas layar', fitLbl, '| zoom minimum 74%, teks node terkecil', t.toFixed(2), 'px');
  assert.deepEqual(errs, []);
  await page.close();
});

test('Perbesar sampai 200% lalu Pas layar, Ctrl+scroll dan klik dua kali di latar kembali ke pas', async () => {
  const { page } = await open(1440, 900);
  const fit = await label(page);
  for (let i = 0; i < 6; i++) await page.click('#zin');
  assert.equal(await label(page), '200%');
  await page.click('#zfit');
  assert.equal(await label(page), fit);
  await page.locator('#gscroll').hover({ position: { x: 300, y: 300 } });
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -100); await page.keyboard.up('Control');
  await page.waitForFunction((f) => document.querySelector('#zlbl').textContent !== f, fit);
  assert.ok((await num(page)) > parseInt(fit, 10));
  await page.locator('#gscroll').dblclick({ position: { x: 6, y: 300 } });
  assert.equal(await label(page), fit);
  await page.close();
});

test('zoom 200%: tarik menggeser grafik, klik setelah tarik tidak memilih node', async () => {
  const { page } = await open(1440, 900);
  for (let i = 0; i < 6; i++) await page.click('#zin');
  const before = await page.evaluate(() => document.querySelector('#gscroll').scrollLeft);
  await page.mouse.move(700, 300); await page.mouse.down(); await page.mouse.move(500, 250, { steps: 5 }); await page.mouse.up();
  assert.ok((await page.evaluate(() => document.querySelector('#gscroll').scrollLeft)) > before + 100);
  assert.equal(await page.locator('.node.sel').count(), 0);
  await page.close();
});

for (const [w, h] of [[1366, 657], [1440, 780], [900, 780]]) {
  test(`${w}x${h}: kontrol zoom tidak menutupi node (pas layar, dan zoom 200% digulir ke kiri-bawah)`, async () => {
    const { page } = await open(w, h);
    const a = await gap(page);
    for (let i = 0; i < 6; i++) await page.click('#zin');
    await page.evaluate(() => { const s = document.querySelector('#gscroll'); s.scrollLeft = 0; s.scrollTop = s.scrollHeight; });
    const b = await gap(page);
    console.log(`# ${w}x${h}: pas`, JSON.stringify(a), '| zoom200 kiri-bawah', JSON.stringify(b));
    assert.equal(a.scrollerBottomToWrap, 48, 'jalur 48 px di bawah area gulir');
    assert.ok(a.ctrlH <= 48, `kontrol ${a.ctrlH} px muat di jalur`);
    assert.equal(a.overlap, 0); assert.equal(b.overlap, 0);
    assert.ok(a.min >= 0 && b.min >= 0, `jarak ${a.min} / ${b.min}`);
    await page.close();
  });
}

test('keyboard: Tab fokus node, Enter membuka (fv-pick), seleksi outline 3 px, fokus bertahan saat node diperbarui, Esc melepas', async () => {
  const { page } = await open(1440, 900, 'running');
  await page.evaluate(() => { window.__picked = []; document.addEventListener('fv-pick', (e) => window.__picked.push(e.detail.id)); });
  await page.focus('#gscroll');
  await page.keyboard.press('Tab');
  const id = await page.evaluate(() => document.activeElement.dataset.id);
  assert.ok(id, 'Tab mendarat di tombol node');
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => window.__picked), [id]);
  const o = await page.evaluate((i) => {
    const c = getComputedStyle(document.querySelector(`.node[data-id="${i}"]`));
    return { w: c.outlineWidth, s: c.outlineStyle, c: c.outlineColor, ink: getComputedStyle(document.body).color };
  }, id);
  console.log('# seleksi:', JSON.stringify(o));
  assert.equal(o.w, '3px'); assert.equal(o.s, 'solid');
  await page.waitForTimeout(2300); // node berjalan ditulis ulang tiap detik
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), id);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.node.sel').count(), 0);
  await page.close();
});
