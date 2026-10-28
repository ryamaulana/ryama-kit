import { chromium } from 'playwright';
import { start } from './mock-server.mjs';
const [,, sc = 'running', theme = 'light', w = '1440', h = '900', panel = '', out = '/tmp/fv_shot.png'] = process.argv;
const s = await start(0, sc);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.addInitScript((t) => { try { localStorage.setItem('fv-theme', t); } catch (e) {} }, theme);
await p.goto(`http://127.0.0.1:${s.port}/`); await p.waitForSelector('.node', { timeout: 5000 }).catch(() => {});
await p.waitForTimeout(400);
if (panel) { await p.click(`#rail button[data-v=${panel}]`); await p.waitForTimeout(500); }
await p.screenshot({ path: out });
console.log(errs.length ? errs.join('\n') : 'tanpa galat');
await b.close(); s.srv.close();
