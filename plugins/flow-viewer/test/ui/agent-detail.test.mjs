// t19a (F4-1, F4-2): detail agent satu kolom di #drawer; Esc di 900-1199 tidak menggeser posisi dan zoom grafik.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/agent-detail.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { start } from './mock-server.mjs';

const { chromium } = await (process.env.PW ? import(pathToFileURL(process.env.PW).href) : import('playwright'));
let srv, browser;
test.before(async () => { srv = await start(0, 'n12'); browser = await chromium.launch(); });
test.after(async () => { await browser.close(); srv.srv.close(); });

async function open(w, h = 900) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/?p=demo`);
  await page.waitForSelector('.node');
  return { page, errs };
}
const gview = (page) => page.evaluate(() => { const s = document.querySelector('#gscroll'); return { z: document.querySelector('#zlbl').textContent, sl: Math.round(s.scrollLeft), st: Math.round(s.scrollTop) }; });

test('1440: klik node membuka detail satu kolom tanpa tab; lipat bertahan antar agent; Esc kembali ke tab data', async () => {
  const { page, errs } = await open(1440);
  await page.click('#rail [data-v=backlog]');
  await page.locator('.node[data-id=prd] .hit').click();
  await page.waitForSelector('#drawer:not([hidden])');
  assert.ok(await page.locator('#pan').isHidden());
  assert.equal(await page.locator('#agtabs, #drawer [data-tab]').count(), 0);
  assert.equal(await page.getAttribute('[data-sec=hasil] h3 button', 'aria-expanded'), 'true');
  assert.equal(await page.getAttribute('[data-sec=files] h3 button', 'aria-expanded'), 'true');
  assert.equal(await page.getAttribute('[data-sec=langkah] h3 button', 'aria-expanded'), 'false');
  await page.click('[data-sec=langkah] h3 button');
  assert.equal(await page.getAttribute('[data-sec=langkah] h3 button', 'aria-expanded'), 'true');
  assert.ok(await page.evaluate(() => document.activeElement.dataset.sec === 'langkah'), 'fokus tetap di tombol');
  await page.locator('.node[data-id=be] .hit').click();
  assert.match(await page.textContent('#dhead'), /be|Backend/i);
  assert.equal(await page.getAttribute('[data-sec=langkah] h3 button', 'aria-expanded'), 'true', 'T4: bagian tetap terbuka di agent lain');
  await page.reload(); await page.waitForSelector('.node');
  await page.locator('.node[data-id=prd] .hit').click();
  assert.equal(await page.getAttribute('[data-sec=langkah] h3 button', 'aria-expanded'), 'true', 'diingat per browser');
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#drawer').isHidden());
  assert.equal(await page.textContent('#ptitle'), 'Backlog', 'kembali ke tab data terakhir');
  assert.equal(await page.locator('#side.collapsed').count(), 0, 'panel tetap terbuka');
  assert.deepEqual(errs, []);
});

test('900: zoom dan posisi grafik sama sebelum dan sesudah Esc', async () => {
  const { page, errs } = await open(900);
  await page.click('#zin'); await page.click('#zin');
  await page.evaluate(() => { const s = document.querySelector('#gscroll'); s.scrollLeft = 140; s.scrollTop = 60; });
  const hit = page.locator('.node[data-id=prd] .hit');
  await hit.scrollIntoViewIfNeeded(); // Playwright menggulir sebelum klik; ukur setelahnya seperti pengguna yang mengklik node yang terlihat
  const before = await gview(page);
  await hit.click();
  await page.waitForSelector('#drawer:not([hidden])');
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#side.collapsed', { state: 'attached' });
  await page.waitForTimeout(250);
  assert.deepEqual(await gview(page), before);
  assert.notEqual(before.z, '100%', 'zoom memang diubah sebelum uji');
  assert.deepEqual(errs, []);
});
