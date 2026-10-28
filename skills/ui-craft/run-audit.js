#!/usr/bin/env node
// Pemakaian: node run-audit.js <url | path-file.html> [--widths 375,1440] [--tokens docs/design-tokens.css] [--lang id|en] [--wait 600] [--out docs/screenshots/audit.json] [--shot docs/screenshots]
// Audit ini mengukur PERINTILAN (kontras, ukuran, overflow, token, hitungan). Lulus audit tidak berarti arah desainnya bagus.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { pathToFileURL } = require('url');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const target = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!target) { console.error('Pemakaian: node run-audit.js <url|file.html> [--widths 375,1440] [--out audit.json] [--shot folder]'); process.exit(1); }
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(path.resolve(target)).href;
const widths = String(flag('widths', '375,1440')).split(',').map(Number);
function readTokens(f) {
  if (!f) return null;
  if (!fs.existsSync(f)) { console.log(`peringatan: file token ${f} tidak ada; cek token dilewati`); return null; }
  const css = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]/g)) if (!(m[1] in vars)) vars[m[1]] = m[2].trim();
  for (let i = 0; i < 5; i++) for (const k of Object.keys(vars)) vars[k] = vars[k].replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_, n, d) => vars[n] || d || _);
  return vars;
}
const tokens = readTokens(flag('tokens'));

function loadPlaywright() {
  const tries = [() => require('playwright'), () => require('playwright-core'),
    () => require(require('module').createRequire(path.join(process.cwd(), 'x.js')).resolve('playwright')),
    () => { const g = cp.execSync('npm root -g', { encoding: 'utf8' }).trim(); return require(path.join(g, 'playwright')); }];
  for (const t of tries) { try { return t(); } catch (_) {} }
  console.error(`PLAYWRIGHT TIDAK DITEMUKAN. Pemilik perlu menjalankan sekali:\n  cd "${__dirname}" && npm install && npx playwright install chromium\nAgent: jangan mencari Playwright di folder lain (Temp, cache npx, NODE_PATH); laporkan baris di atas dan lanjut tanpa audit.`);
  process.exit(3);
}
(async () => {
  const { chromium } = loadPlaywright();
  const src = fs.readFileSync(path.join(__dirname, 'audit-dom.js'), 'utf8');
  const browser = await chromium.launch();
  const all = [];
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: w <= 480 ? 812 : 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(Number(flag('wait', 600)));
    const res = await page.evaluate(`(function(){ ${src}\n return __uiAudit({ lang: ${JSON.stringify(String(flag('lang', '')))}, tokens: ${JSON.stringify(tokens)} }); })()`);
    all.push(res);
    const shotDir = flag('shot');
    if (shotDir) { fs.mkdirSync(shotDir, { recursive: true }); await page.screenshot({ path: path.join(shotDir, `audit-${w}.png`), fullPage: true }); }
    await page.close();
  }
  await browser.close();
  let high = 0, tokOff = 0;
  for (const r of all) {
    high += r.counts.high;
    tokOff += r.issues.filter((i) => i.rule.startsWith('token-')).length;
    console.log(`\n=== ${url}  @${r.viewport.w}px  ->  tinggi:${r.counts.high} sedang:${r.counts.medium} rendah:${r.counts.low}`);
    const st = r.stats;
    console.log(`ukuran huruf: ${st.ukuranHuruf.join(', ')} | radius: ${st.radius.join(', ') || '-'} | bayangan: ${st.bayangan} | warna teks: ${st.warnaTeks} | spasi di luar skala: ${st.spasiDiLuarSkalaPersen}%`);
    console.log(`elemen terkuat (kandidat titik fokus): ${st.elemenTerkuat.join(' | ')}`);
    console.log(`gambar: ${st.jumlahGambar}, svg: ${st.jumlahSvg}, tombol solid di layar pertama: ${st.tombolSolidDiLayarPertama}`);
    console.log(`keluarga huruf: ${st.keluargaHuruf.length} | kelompok warna jenuh: ${st.warnaAksen} | grup kartu identik: ${st.grupKartuSeragam} (${st.jumlahKartuSeragam} kartu) | blok warna jenuh layar pertama: ${st.blokWarnaJenuhLayarPertamaPersen}%`);
    console.log(`kandidat fokus layar pertama: ${st.kandidatFokus.join(' vs ') || '-'}`);
    console.log(st.token.aktif ? `token: warna di luar ${st.token.warnaDiLuar}, radius di luar ${st.token.radiusDiLuar}, ukuran huruf di luar ${st.token.hurufDiLuar}, font di luar ${st.token.fontDiLuar}` : 'token: tidak dicek (pakai --tokens docs/design-tokens.css)');
    r.issues.slice(0, 30).forEach((i) => console.log(`[${i.sev.toUpperCase()}] ${i.rule}: ${i.detail}${i.at ? '  @ ' + i.at : ''}`));
    if (r.issues.length > 30) console.log(`... +${r.issues.length - 30} temuan lain (lihat --out)`);
  }
  const why = [high ? `${high} temuan tinggi` : '', tokOff ? `${tokOff} temuan nilai di luar token` : ''].filter(Boolean).join(', ');
  console.log(`\nVERDICT: ${why ? `GAGAL (${why})` : 'LULUS (0 temuan tinggi' + (tokens ? ', semua nilai dari token)' : ')')}`);
  console.log('Catatan: audit hanya mengukur perintilan. Titik fokus, hierarki, dan arah dinilai terhadap Rancangan layar di DESIGN.md.');
  const out = flag('out'); if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(all, null, 2)); }
})();
