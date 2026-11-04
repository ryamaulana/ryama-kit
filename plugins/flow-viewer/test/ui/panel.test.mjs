// t18a (F9-1): panel samping + rel enam kunci + tab Percakapan/Backlog di 900 dan 1440 px.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/panel.test.mjs   (tanpa PW: import 'playwright')
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

async function open(w, h = 900, ctx) {
  const page = await (ctx || await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.port}/?p=demo`);
  await page.waitForSelector('.node');
  return { page, errs };
}
const box = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width }; }, sel);
const railState = (page) => page.evaluate(() => [...document.querySelectorAll('#rail button')].map((b) => ({ v: b.dataset.v, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), badge: b.querySelector('.badge')?.textContent || null, warn: !!b.querySelector('.badge-warn') })));

test('1440 px: panel terbuka 380 px, rel enam kunci, lencana warn hanya Percakapan dan Backlog', async () => {
  const { page, errs } = await open(1440);
  await page.waitForSelector('#pi .m');
  assert.equal((await box(page, '#side')).w, 380);
  const rail = await railState(page);
  assert.deepEqual(rail.map((b) => b.v), ['chat', 'backlog', 'files', 'skill', 'token', 'log']);
  const by = Object.fromEntries(rail.map((b) => [b.v, b]));
  assert.ok(by.chat.badge && by.chat.warn, 'Percakapan: pertanyaan terbuka, warn');
  assert.ok(by.backlog.badge && by.backlog.warn, 'Backlog: keputusan menunggu, warn');
  assert.ok(by.files.badge && !by.files.warn, 'File: netral');
  assert.equal(by.token.badge, null); assert.equal(by.log.badge, null);
  assert.equal(by.chat.pressed, 'true');
  // F9-1 / UX §8: data 1.7.1 vs klik, tiap tab satu klik dari Live
  const got = {};
  for (const k of ['chat', 'backlog', 'files', 'skill', 'token', 'log']) { await page.click(`#rail [data-v=${k}]`); got[k] = await page.textContent('#ptitle'); }
  assert.deepEqual(got, { chat: 'Percakapan', backlog: 'Backlog', files: 'File', skill: 'Skill', token: 'Token', log: 'Log' });
  await page.click('#rail [data-v=chat]');
  assert.equal(await page.locator('#pi .m').count(), 3);
  assert.match(await page.textContent('#pi'), /Jawab di aplikasi Claude\./);
  await page.click('#rail [data-v=backlog]');
  assert.match(await page.textContent('#pi'), /Perlu keputusanmu/);
  await page.screenshot({ path: path.join(here, 't18a-1440.png') });
  assert.deepEqual(errs, []);
  await page.close();
});

test('1440 px: tab dan lebar diingat setelah muat ulang; lebar dibatasi 320 sampai 60%', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const { page } = await open(1440, 900, ctx);
  await page.click('#rail [data-v=backlog]');
  await page.focus('#rz');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  assert.equal((await box(page, '#side')).w, 380 + 72);
  for (let i = 0; i < 80; i++) await page.keyboard.press('ArrowRight');
  assert.equal((await box(page, '#side')).w, 320);
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
  await page.reload(); await page.waitForSelector('.node');
  assert.equal(await page.textContent('#ptitle'), 'Backlog');
  assert.equal((await box(page, '#side')).w, 320 + 144);
  // tutup lewat tombol Panel: diingat di 1200+
  await page.click('#tchat');
  assert.ok(await page.locator('#side.collapsed').count());
  await page.reload(); await page.waitForSelector('.node');
  assert.ok(await page.locator('#side.collapsed').count(), 'tertutup diingat');
  assert.ok(await page.locator('#rail').isVisible(), 'rel tetap terlihat');
  await ctx.close();
});

test('900 px: tertutup bawaan; dibuka 340 px mendorong grafik; node terpilih terlihat; Esc menutup', async () => {
  const { page, errs } = await open(900);
  assert.ok(await page.locator('#side.collapsed').count(), 'tertutup bawaan');
  const before = await box(page, '#gscroll');
  await page.click('#rail [data-v=chat]');
  await page.waitForSelector('#pi .m');
  const side = await box(page, '#side'), after = await box(page, '#gscroll');
  assert.equal(side.w, 340);
  assert.ok(after.r <= side.l + 0.5, 'grafik tidak tertimpa panel');
  assert.ok(after.w < before.w - 300, 'grafik didorong (menyempit)');
  // node paling kanan: klik lewat fokus keyboard supaya tidak tergantung posisi gulir, lalu cek terlihat penuh
  await page.click('#rail [data-v=chat]'); // tutup (klik tab aktif)
  assert.ok(await page.locator('#side.collapsed').count());
  const id = await page.evaluate(() => [...document.querySelectorAll('.node')].sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0].dataset.id);
  await page.locator(`.node[data-id="${id}"] .hit`).click();
  assert.equal(await page.locator('#side.collapsed').count(), 0, 'klik node membuka panel');
  await page.waitForTimeout(250);
  const vis = await page.evaluate((i) => { const n = document.querySelector(`.node[data-id="${i}"]`).getBoundingClientRect(), v = document.querySelector('#gscroll').getBoundingClientRect(); return { l: n.left - v.left, r: v.right - n.right, t: n.top - v.top, b: v.bottom - n.bottom }; }, id);
  console.log('# 900 px node terpilih (jarak ke tepi area gulir):', JSON.stringify(vis));
  assert.ok(vis.l >= -0.5 && vis.r >= -0.5 && vis.t >= -0.5 && vis.b >= -0.5, 'node terpilih terlihat penuh');
  await page.screenshot({ path: path.join(here, 't18a-900.png') });
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#side.collapsed').count(), 'Esc menutup di 900-1199');
  assert.equal(await page.locator('.node.sel').count(), 0, 'pilihan node dilepas');
  assert.deepEqual(errs, []);
  await page.close();
});

test('1440 px: Esc melepas pilihan tetapi panel tetap terbuka', async () => {
  const { page } = await open(1440);
  await page.locator('.node .hit').first().click();
  assert.equal(await page.locator('.node.sel').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.node.sel').count(), 0);
  assert.equal(await page.locator('#side.collapsed').count(), 0);
  await page.close();
});
