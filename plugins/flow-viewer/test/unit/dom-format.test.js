const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (f) => import(pathToFileURL(path.join(__dirname, '../../server/public/js', f)).href);

test('html: sisipan jahat jadi teks, bukan elemen', async () => {
  const { html } = await load('dom.js');
  const out = String(html`<p>${'<img src=x onerror=alert(1)>'}</p>`);
  assert.strictEqual(out, '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  assert.ok(!out.includes('<img'));
});

test('html: kutip di atribut di-escape; null/false kosong; array digabung', async () => {
  const { html } = await load('dom.js');
  assert.strictEqual(String(html`<a title="${'" onmouseover="x'}">${null}${false}${[1, '<b>']}</a>`),
    '<a title="&quot; onmouseover=&quot;x">1&lt;b&gt;</a>');
});

test('html: bersarang tidak di-escape dua kali; raw dipercaya apa adanya', async () => {
  const { html, raw } = await load('dom.js');
  const inner = html`<b>${'a&b'}</b>`;
  assert.strictEqual(String(html`<p>${inner}${raw('<i/>')}</p>`), '<p><b>a&amp;b</b><i/></p>');
});

test('patch: menulis hanya bila berubah; string biasa jadi teks', async () => {
  const { html, patch } = await load('dom.js');
  const el = { innerHTML: '', textContent: '' };
  assert.strictEqual(patch(el, html`<b>x</b>`), true);
  assert.strictEqual(el.innerHTML, '<b>x</b>');
  assert.strictEqual(patch(el, html`<b>x</b>`), false);
  assert.strictEqual(patch(el, '<img onerror=1>'), true);
  assert.strictEqual(el.textContent, '<img onerror=1>');
  assert.strictEqual(el.innerHTML, '<b>x</b>', 'string biasa tidak menyentuh innerHTML');
});

test('fmtDur: "N mnt N dtk", di bawah semenit hanya dtk, nilai buruk jadi 0 dtk', async () => {
  const { fmtDur } = await load('format.js');
  assert.strictEqual(fmtDur(83000), '1 mnt 23 dtk');
  assert.strictEqual(fmtDur(60000), '1 mnt 0 dtk');
  assert.strictEqual(fmtDur(5400), '5 dtk');
  assert.strictEqual(fmtDur(3720000), '1 jam 2 mnt');
  assert.strictEqual(fmtDur(-5), '0 dtk');
  assert.strictEqual(fmtDur(undefined), '0 dtk');
});

test('fmtTok: ribu "rb", juta "jt", koma desimal', async () => {
  const { fmtTok } = await load('format.js');
  assert.strictEqual(fmtTok(842), '842');
  assert.strictEqual(fmtTok(1500), '1,5 rb');
  assert.strictEqual(fmtTok(12400), '12 rb');
  assert.strictEqual(fmtTok(11040000), '11 jt');
  assert.strictEqual(fmtTok(2540000), '2,5 jt');
  assert.strictEqual(fmtTok(null), '0');
});

test('icons: enam status punya ikon aria-hidden dan label; status tak dikenal jadi Menunggu', async () => {
  const { statusIcon, statusLabel, STATUS } = await load('icons.js');
  assert.deepStrictEqual(Object.values(STATUS),
    ['Berjalan', 'Selesai', 'Butuh input', 'Gagal', 'Dilewati', 'Menunggu']);
  for (const k of Object.keys(STATUS)) {
    const s = String(statusIcon(k));
    assert.match(s, /^<svg [^>]*aria-hidden="true"/);
    assert.ok(s.includes(`ic-${k}`));
  }
  assert.strictEqual(statusLabel('idle'), 'Menunggu');
  assert.strictEqual(statusLabel('zzz"<'), 'Menunggu');
  assert.ok(!String(statusIcon('zzz"<')).includes('zzz'));
});

test('grep: innerHTML, outerHTML, insertAdjacentHTML tidak muncul di luar dom.js', () => {
  const fs = require('node:fs');
  const root = path.join(__dirname, '../../server/public');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const bad = walk(root)
    .filter((f) => /\.(js|html)$/.test(f) && path.basename(f) !== 'dom.js')
    .filter((f) => /innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(fs.readFileSync(f, 'utf8')));
  assert.deepStrictEqual(bad, []);
});
