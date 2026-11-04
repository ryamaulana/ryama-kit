// Uji UI dengan Playwright terhadap server tiruan. Jalankan: node --test test/ui
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { start } from './mock-server.mjs';

let b, s, errs;
test.before(async () => { b = await chromium.launch(); s = await start(0, 'running'); });
test.after(async () => { await b.close(); s.srv.close(); });

async function open(scn, { w = 1440, h = 900, theme = 'light' } = {}) {
  s.set(scn);
  const p = await b.newPage({ viewport: { width: w, height: h } });
  errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript((t) => { try { localStorage.setItem('fv-theme', t); } catch (e) {} }, theme);
  await p.goto('http://127.0.0.1:' + s.port + '/');
  await p.waitForSelector('.node');
  return p;
}
const vis = (p, sel) => p.locator(sel).isVisible();

for (const scn of ['running', 'failed', 'done', 'empty', 'many']) {
  for (const w of [1440, 1280, 1024]) {
    test(scn + ' @' + w + ': header esensial terlihat dan tanpa galat', async () => {
      const p = await open(scn, { w });
      for (const id of ['#hb-run', '#hb-dur', '#hb-prog', '#tkov', '#theme', '#more']) assert.ok(await vis(p, id), id + ' tidak terlihat');
      const horiz = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(horiz, false, 'ada scroll horizontal');
      assert.deepEqual(errs, []);
      await p.close();
    });
  }
}
test('status node sesuai skenario', async () => {
  let p = await open('running');
  assert.equal(await p.locator('.node.st-running').count(), 2);
  assert.ok(await p.locator('.node[data-id="__main"].st-input').count());
  assert.match(await p.locator('#need').innerText(), /butuh jawabanmu/);
  await p.close();
  p = await open('failed');
  assert.ok(await p.locator('.node[data-id=be].st-failed').count());
  assert.match(await p.locator('#need').innerText(), /gagal/);
  await p.close();
  p = await open('done');
  assert.equal(await p.locator('.node.st-running').count(), 0);
  assert.match(await p.locator('#need').innerText(), /selesai/i);
  await p.close();
  p = await open('empty');
  assert.ok(await vis(p, '#empty'));
  await p.close();
});
test('rail membuka panel dan Esc menutup', async () => {
  const p = await open('running');
  for (const k of ['chat', 'backlog', 'files', 'skill', 'token', 'agent', 'history', 'log']) {
    await p.click('#rail button[data-v=' + k + ']');
    await p.waitForTimeout(120);
    assert.ok(await p.locator('#pan.open').count(), 'panel ' + k + ' tidak terbuka');
    assert.ok((await p.locator('#pi h2').innerText()).length > 2);
  }
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('#pan.open').count(), 0);
  assert.deepEqual(errs, []);
  await p.close();
});
test('detail agent: tab aktivitas dan files', async () => {
  const p = await open('running');
  await p.click('.node[data-id=prd] .tile');
  await p.waitForSelector('#drawer');
  await p.click('[data-tab=aktivitas]');
  assert.ok(await p.locator('.rh').count() >= 1);
  await p.click('[data-tab=files]');
  assert.ok(await p.locator('#drawer .row').count() >= 1);
  assert.deepEqual(errs, []);
  await p.close();
});
test('token: buka isi konteks agent', async () => {
  const p = await open('running');
  await p.click('#tkov');
  await p.click('.agx .agh');
  assert.ok(await vis(p, '.ctxb'));
  await p.close();
});
test('tema tersimpan', async () => {
  const p = await open('running');
  await p.click('#theme');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await p.evaluate(() => localStorage.getItem('fv-theme')), 'dark');
  await p.close();
});
test('pengaturan: reset dua langkah', async () => {
  const p = await open('running');
  await p.click('#more');
  assert.ok(await vis(p, '#pmenu'));
  await p.click('#reset');
  assert.match(await p.locator('#reset').innerText(), /Yakin/);
  await p.keyboard.press('Escape');
  assert.ok(!(await vis(p, '#pmenu')));
  await p.close();
});
test('ringkasan run dari pill selesai', async () => {
  const p = await open('done');
  await p.click('#need');
  assert.ok(await vis(p, '#modal .mc'));
  await p.keyboard.press('Escape');
  assert.ok(!(await vis(p, '#modal .mc')));
  await p.close();
});
test('XSS: teks dari data tidak dieksekusi', async () => {
  s.set('running');
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => { window.__x = 0; });
  await p.route('**/stream', async (r) => {
    const { scenario } = await import('./mock-server.mjs');
    const S = scenario('running').S;
    S.prompt = '<img src=x onerror="window.__x=1">';
    S.nodes.be.last = '<img src=x onerror="window.__x=1">';
    S.pending.text = '<img src=x onerror="window.__x=1">';
    r.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: 'data: ' + JSON.stringify(S) + '\n\n' });
  });
  await p.goto('http://127.0.0.1:' + s.port + '/');
  await p.waitForSelector('.node');
  await p.click('#rail button[data-v=chat]');
  await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => window.__x), 0);
  assert.equal(await p.locator('img[src=x]').count(), 0);
  await p.close();
});
test('tanpa skrip inline (CSP script-src self)', async () => {
  const p = await open('running');
  assert.equal(await p.locator('script:not([src])').count(), 0);
  await p.close();
});

test('R1 Riwayat: tanpa Laporan per baris, Buka membuka run (bukan laporan), Laporan token di kepala', async () => {
  const p = await open('done');
  await p.click('#rail button[data-v=history]');
  await p.waitForSelector('.ck[data-run]'); await p.waitForTimeout(500);
  assert.equal(await p.locator('.ck [data-act=trep]').count(), 0);
  assert.equal(await p.locator('#pi [data-act=trep]').count(), 1);
  assert.equal(await p.locator('#pi [data-act=trep]').getAttribute('data-project'), 'demo');
  await p.locator('.ck[data-run="1"] [data-act=hopen]').dispatchEvent('click'); // mock SSE merender ulang panel terus; klik koordinat tidak stabil
  await p.waitForTimeout(300);
  assert.equal(await p.locator('#modal.on').count(), 0, 'Buka tidak boleh membuka laporan');
  await p.locator('#histbar b', { hasText: 'Melihat riwayat' }).waitFor({ state: 'visible', timeout: 3000 }); // (b) Buka membuka run
  await p.close();
});
test('R1c Laporan token di kepala Riwayat membuka laporan berjudul proyek Riwayat', async () => {
  const p = await open('done');
  await p.click('#rail button[data-v=history]');
  await p.waitForSelector('#pi [data-act=trep]');
  const proj = await p.locator('#pi [data-act=trep]').getAttribute('data-project');
  assert.ok(proj, 'tombol Laporan token membawa data-project');
  let url = '';
  await p.route('**/report/tokens.md*', (r) => { url = r.request().url(); r.fulfill({ status: 200, contentType: 'text/markdown', body: '# Laporan token ' + proj + '\n\nisi' }); });
  await p.locator('#pi [data-act=trep]').dispatchEvent('click');
  await p.locator('#modal.on').waitFor({ state: 'attached', timeout: 3000 });
  const t = await p.locator('#mc').innerText();
  assert.ok(url.includes('project=' + proj), 'permintaan laporan memakai proyek Riwayat, dapat: ' + url);
  assert.ok(t.includes(proj), 'laporan memuat nama proyek Riwayat "' + proj + '", dapat: ' + t.slice(0, 120));
  await p.close();
});
