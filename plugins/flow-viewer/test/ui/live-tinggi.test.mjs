// t16c (F3-4, F2-3): Live muat di tinggi laptop. Isi pita, kotak Butuh input, panel, dan rel diganjal tinggi supaya terbukti menggulung di dalam.
// Jalankan: PW=<path ke playwright/index.mjs> node --test test/ui/live-tinggi.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { start } from './mock-server.mjs';

const { chromium } = await (process.env.PW ? import(pathToFileURL(process.env.PW).href) : import('playwright'));
let srv, browser;
test.before(async () => { srv = await start(0, 'n12'); browser = await chromium.launch(); });
test.after(async () => { await browser.close(); srv.srv.close(); });

for (const [w, h] of [[1366, 657], [1440, 780], [900, 780], [1440, 900]]) {
  test(`${w}x${h}: halaman tidak menggulung; rel, panel, dan kotak Butuh input menggulung di dalam; zoom terjangkau`, async () => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`http://127.0.0.1:${srv.port}/?p=demo`); await page.waitForSelector('.node');
    await page.evaluate(() => {
      document.querySelector('#strip').insertAdjacentHTML('beforeend', '<div class="ribbon" style="height:90px"></div><div class="notice"><div class="n-top"><h2>Butuh input</h2></div><div class="n-q">' + '<p class="n-ctx">Pertanyaan panjang untuk menguji gulir di dalam kotak.</p>'.repeat(25) + '</div></div>');
      document.querySelector('#pan').innerHTML = '<div style="height:3000px;flex:none">isi</div>';
      document.querySelector('#rail').insertAdjacentHTML('beforeend', '<button type="button" style="height:40px;flex:none">x</button>'.repeat(10));
    });
    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect(), main = r('main'), rail = document.querySelector('#rail'), n = r('.notice'), z = r('#zwrap'), pan = document.querySelector('#pan');
      return { page: document.documentElement.scrollHeight - innerHeight, notice: n.height, vh: innerHeight, railOver: rail.scrollHeight > rail.clientHeight, railIn: rail.getBoundingClientRect().bottom <= main.bottom, panOver: pan.scrollHeight > pan.clientHeight, panIn: pan.getBoundingClientRect().bottom <= main.bottom, zoomIn: z.top >= main.top && z.bottom <= innerHeight, mainBottom: main.bottom };
    });
    await page.screenshot({ path: new URL(`./t16c-${w}x${h}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
    console.log(`# ${w}x${h}`, JSON.stringify(m));
    assert.equal(m.page, 0, 'Live tidak menggulung sebagai halaman');
    assert.ok(m.notice <= m.vh * 0.3 + 1, `kotak Butuh input ${m.notice} <= 30% tinggi`);
    assert.ok(m.railOver && m.railIn, 'rel menggulung di dalam baris');
    assert.ok(m.panOver && m.panIn, 'panel menggulung di dalam baris');
    assert.ok(m.zoomIn, 'kontrol zoom terjangkau');
    assert.ok(m.mainBottom <= m.vh);
    await page.close();
  });
}
