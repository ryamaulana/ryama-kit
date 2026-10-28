// ui-craft audit: mengukur halaman yang sudah dirender. Tidak menilai selera atau arah, hanya perintilan yang bisa dihitung.
// Dipakai lewat run-audit.js, atau tempel ke Playwright MCP browser_evaluate:
//   () => { <isi file ini>; return __uiAudit({}); }
function __uiAudit(opts) {
  opts = opts || {};
  const vw = window.innerWidth, vh = window.innerHeight;
  const mobile = vw <= 480;
  const issues = [];
  const add = (sev, rule, detail, el) => issues.push({ sev, rule, detail, at: el ? sel(el) : undefined });
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const toRGBA = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (fg, bg) => { const a = fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.classList && el.classList.length) s += '.' + el.classList[0];
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return t ? `${s} "${t}"` : s;
  };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'HEAD', 'TITLE', 'BR', 'PATH', 'CIRCLE', 'RECT', 'G', 'DEFS', 'USE', 'LINE', 'POLYGON', 'POLYLINE', 'ELLIPSE']);
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.01; };
  const els = Array.from(document.body.querySelectorAll('*')).filter((e) => !SKIP.has(e.tagName.toUpperCase()) && visible(e));
  const hasText = (e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const textEls = els.filter(hasText);
  const px = (v) => parseFloat(v) || 0;

  // ---- warna latar efektif (null = tidak bisa dipastikan: gambar/gradien)
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = toRGBA(cs.backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
    }
    let base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const opacityOf = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };

  // ---- 1. kontras teks
  const fontSizes = {}, textColors = {}, families = {};
  const lowC = [];
  textEls.forEach((el) => {
    const cs = getComputedStyle(el);
    const size = Math.round(px(cs.fontSize) * 10) / 10, weight = parseInt(cs.fontWeight, 10) || 400;
    fontSizes[size] = (fontSizes[size] || 0) + 1;
    families[cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()] = 1;
    const fg0 = toRGBA(cs.color);
    textColors[fg0.slice(0, 3).map(Math.round).join(',')] = 1;
    const bg = bgOf(el);
    if (!bg) return;
    const a = fg0[3] * opacityOf(el);
    const fg = over([fg0[0], fg0[1], fg0[2], a], bg);
    const r = ratio(fg, bg);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (r < need) lowC.push({ el, r, need, size });
  });
  lowC.sort((a, b) => a.r - b.r).slice(0, 25).forEach((x) => add(x.r < x.need * 0.8 ? 'high' : 'medium', 'kontras', `rasio ${x.r.toFixed(2)}:1, butuh ${x.need}:1 (teks ${x.size}px)`, x.el));
  if (lowC.length > 25) add('medium', 'kontras', `${lowC.length - 25} elemen lain juga di bawah batas`);

  // ---- 2. ukuran huruf
  const sizes = Object.keys(fontSizes).map(Number).sort((a, b) => a - b);
  textEls.forEach((el) => {
    const s = px(getComputedStyle(el).fontSize);
    if (s < 11) add('high', 'ukuran-huruf', `${s}px terlalu kecil (minimal 12px)`, el);
    else if (s < 12) add('medium', 'ukuran-huruf', `${s}px di bawah 12px`, el);
  });
  if (sizes.length > 9) add('medium', 'skala-tipografi', `${sizes.length} ukuran huruf berbeda (${sizes.join(', ')}); idealnya maksimal 6-8 pada satu skala`);
  const fams = Object.keys(families);

  // ---- 3. baris teks: panjang & tinggi baris
  const blocks = els.filter((e) => /^(P|LI|BLOCKQUOTE|DD)$/.test(e.tagName) && (e.textContent || '').trim().length >= 100);
  blocks.forEach((el) => {
    const cs = getComputedStyle(el), size = px(cs.fontSize);
    let lh = px(cs.lineHeight); if (!lh) lh = size * 1.2;
    const lines = Math.round(el.getBoundingClientRect().height / lh);
    const len = (el.textContent || '').trim().length;
    if (lines >= 2) { const cpl = len / lines; if (cpl > 110) add('high', 'panjang-baris', `±${Math.round(cpl)} karakter per baris (ideal 45-75)`, el); else if (cpl > 90) add('medium', 'panjang-baris', `±${Math.round(cpl)} karakter per baris (ideal 45-75)`, el); }
    if (size <= 20 && lh / size < 1.4) add(lh / size < 1.3 ? 'high' : 'medium', 'tinggi-baris', `line-height ${(lh / size).toFixed(2)} untuk teks isi (ideal 1.5-1.65)`, el);
  });
  els.filter((e) => /^H[1-3]$/.test(e.tagName)).forEach((el) => {
    const cs = getComputedStyle(el), size = px(cs.fontSize), lh = px(cs.lineHeight);
    if (lh && size >= 28 && lh / size > 1.4) add('low', 'tinggi-baris', `judul ${size}px dengan line-height ${(lh / size).toFixed(2)} (ideal 1.1-1.25)`, el);
  });

  // ---- 4. target sentuh / klik
  const inter = els.filter((e) => e.matches('button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, [role=button], [role=tab], summary, a[href]'));
  const small = [];
  inter.forEach((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, span, td')) return; // tautan di dalam teks
    const min = Math.min(r.width, r.height);
    const need = mobile ? 44 : 24;
    if (min < need) small.push({ el, min, need });
  });
  small.slice(0, 20).forEach((x) => add(x.min < x.need * 0.73 ? 'high' : 'medium', 'target-sentuh', `${Math.round(x.min)}px, butuh minimal ${x.need}px`, x.el));
  if (small.length > 20) add('medium', 'target-sentuh', `${small.length - 20} target kecil lain`);

  // ---- 5. spasi, radius, bayangan, warna
  const spacing = {}, radii = {}, shadows = {}, bgs = {};
  els.forEach((el) => {
    const cs = getComputedStyle(el);
    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap'].forEach((k) => {
      const v = Math.round(px(cs[k])); if (v > 0 && v < 400) spacing[v] = (spacing[v] || 0) + 1;
    });
    const hasBox = toRGBA(cs.backgroundColor)[3] > 0.05 || (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none');
    if (hasBox) {
      const rr = Math.round(px(cs.borderTopLeftRadius)); if (rr > 0 && rr < 999) radii[rr] = (radii[rr] || 0) + 1;
      const bc = toRGBA(cs.backgroundColor); if (bc[3] > 0.05) bgs[bc.slice(0, 3).map(Math.round).join(',')] = 1;
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') shadows[cs.boxShadow] = 1;
  });
  const spVals = Object.keys(spacing).map(Number); const spTotal = spVals.reduce((a, v) => a + spacing[v], 0);
  const off = spVals.filter((v) => v % 4 !== 0 && v !== 2 && v !== 6);
  const offCount = off.reduce((a, v) => a + spacing[v], 0);
  const offPct = spTotal ? Math.round(offCount / spTotal * 100) : 0;
  if (offPct > 35 && spVals.length > 14) add('medium', 'skala-spasi', `${offPct}% nilai spasi tidak mengikuti kelipatan 4px; ${spVals.length} nilai berbeda. Contoh di luar skala: ${off.sort((a, b) => spacing[b] - spacing[a]).slice(0, 8).join(', ')}px`);
  else if (spVals.length > 22) add('low', 'skala-spasi', `${spVals.length} nilai spasi berbeda; idealnya mengerucut ke 8-10 nilai`);
  const rKeys = Object.keys(radii); if (rKeys.length > 5) add('medium', 'radius', `${rKeys.length} nilai radius berbeda (${rKeys.join(', ')}px); idealnya 2-3`);
  const sKeys = Object.keys(shadows); if (sKeys.length > 4) add('medium', 'bayangan', `${sKeys.length} gaya bayangan berbeda; idealnya maksimal 3 tingkat`);
  const tc = Object.keys(textColors).length; if (tc > 8) add('medium', 'warna-teks', `${tc} warna teks berbeda; idealnya 3-5 peran (utama, sekunder, redup, tautan, status)`);
  const bc2 = Object.keys(bgs).length; if (bc2 > 12) add('low', 'warna-latar', `${bc2} warna latar berbeda`);

  // ---- 6. overflow
  const de = document.documentElement;
  if (de.scrollWidth > vw + 1) {
    add('high', 'scroll-horizontal', `halaman melebar ${de.scrollWidth}px pada viewport ${vw}px`);
    els.filter((e) => e.getBoundingClientRect().right > vw + 2).slice(0, 4).forEach((e) => add('high', 'scroll-horizontal', 'elemen melewati tepi kanan', e));
  }

  // ---- 7. struktur & aksesibilitas
  const hs = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible);
  const h1 = hs.filter((h) => h.tagName === 'H1').length;
  if (h1 !== 1) add('medium', 'heading', `ada ${h1} elemen h1 (seharusnya 1)`);
  let prev = 0; hs.forEach((h) => { const l = Number(h.tagName[1]); if (prev && l > prev + 1) add('low', 'heading', `loncat dari h${prev} ke h${l}`, h); prev = l; });
  Array.from(document.querySelectorAll('img')).filter(visible).forEach((im) => {
    if (!im.hasAttribute('alt')) add('high', 'alt-gambar', 'gambar tanpa atribut alt', im);
    if (im.naturalWidth && im.naturalWidth < im.getBoundingClientRect().width * 0.8) add('medium', 'gambar-buram', `resolusi ${im.naturalWidth}px ditampilkan ${Math.round(im.getBoundingClientRect().width)}px`, im);
  });
  Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')).filter(visible).forEach((f) => {
    const labelled = f.getAttribute('aria-label') || f.getAttribute('aria-labelledby') || (f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`)) || f.closest('label');
    if (!labelled) add('high', 'label-form', f.placeholder ? 'field hanya punya placeholder, tanpa label' : 'field tanpa label', f);
  });
  if (!document.documentElement.lang) add('low', 'bahasa', 'atribut lang pada <html> kosong');

  // ---- 8. titik fokus (heuristik)
  const above = Array.from(document.querySelectorAll('button, a[href], [role=button]')).filter((e) => { if (!visible(e)) return false; const r = e.getBoundingClientRect(); if (r.top > vh) return false; const bg = toRGBA(getComputedStyle(e).backgroundColor); return bg[3] > 0.8 && (e.textContent || '').trim().length > 0 && r.height >= 28; });
  const filledKinds = {}; above.forEach((e) => { filledKinds[toRGBA(getComputedStyle(e).backgroundColor).slice(0, 3).map(Math.round).join(',')] = (filledKinds[toRGBA(getComputedStyle(e).backgroundColor).slice(0, 3).map(Math.round).join(',')] || 0) + 1; });
  if (above.length > 3) add('medium', 'titik-fokus', `${above.length} tombol/tautan berlatar solid di layar pertama; terlalu banyak yang berebut perhatian (biasanya 1-2 aksi utama)`);
  const strong = textEls.map((e) => { const cs = getComputedStyle(e); return { e, score: px(cs.fontSize) * (parseInt(cs.fontWeight, 10) || 400) / 400 }; }).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => sel(x.e));

  // ---- 9. alignment tepi kiri (informasi)
  const lefts = {}; textEls.forEach((e) => { const x = Math.round(e.getBoundingClientRect().left / 2) * 2; lefts[x] = (lefts[x] || 0) + 1; });
  const leftTop = Object.entries(lefts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([x, n]) => `${x}px(${n})`);

  // ---- 10. copy (teks UI): hanya yang bisa dihitung; kejelasan makna dinilai critic (skill ux-writing)
  // bahasa UI: opts.lang, lalu <html lang>; 'id' hanya aturan Indonesia, 'en' hanya Inggris, tidak diketahui = keduanya
  const LANG = String(opts.lang || document.documentElement.lang || '').toLowerCase(), useId = !LANG.startsWith('en'), useEn = !LANG.startsWith('id');
  const anyRe = (a, b) => (t) => (useId && a.test(t)) || (useEn && b.test(t));
  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const words = (t) => clean(t).split(' ').filter(Boolean).length;
  const quote = (t) => '"' + clean(t).slice(0, 70) + '"';
  hs.forEach((h) => {
    const n = words(h.textContent);
    if (n > 8) add('medium', 'copy-judul', `judul ${n} kata (batas 8, ideal 6): ${quote(h.textContent)}`, h);
    if (anyRe(/^selamat datang/i, /^welcome( back)?\b/i)(clean(h.textContent))) add('low', 'copy-judul', `judul sapaan tidak memberi informasi: ${quote(h.textContent)}`, h);
  });
  const own = (e) => clean(Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
  const proseEls = els.filter((e) => !e.closest('button, a, h1, h2, h3, h4, h5, h6, label, option') && own(e).split(' ').length >= 5);
  const seen = {};
  proseEls.forEach((e) => {
    const t = own(e);
    t.split(/(?<=[.!?])\s+/).forEach((sn) => { const n = words(sn); if (n > 22) add('medium', 'copy-kalimat', `kalimat ${n} kata (batas 20): ${quote(sn)}`, e); });
    if (words(t) > 45) add('low', 'copy-paragraf', `paragraf ${words(t)} kata; pecah atau ringkas: ${quote(t)}`, e);
    const k = t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ''); if (k.split(' ').length >= 4) { if (seen[k]) add('low', 'copy-ulang', `kalimat yang sama muncul dua kali: ${quote(t)}`, e); seen[k] = 1; }
  });
  Array.from(document.querySelectorAll('button, input[type=submit], [role=button]')).filter(visible).forEach((b) => {
    const t = clean(b.value || b.textContent); if (!t) return;
    if (words(t) > 4) add('low', 'copy-tombol', `tombol ${words(t)} kata (ideal 1-3): ${quote(t)}`, b);
    if (anyRe(/^(ok|oke|kirim|submit|klik di sini|klik disini|selengkapnya|lanjut)$/i, /^(ok|okay|submit|send|click here|learn more|read more|continue|go)$/i)(t)) add('low', 'copy-tombol', `label tombol tidak menyebut aksi: ${quote(t)}`, b);
  });
  Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]')).filter(visible).forEach((f) => {
    if (anyRe(/(minimal|maksimal|wajib|harus|\d+\s*(karakter|huruf|angka))/i, /(minimum|maximum|at least|required|must|\d+\s*(characters|letters|digits|numbers))/i)(f.placeholder)) add('medium', 'copy-placeholder', `placeholder berisi aturan ${quote(f.placeholder)}: pindahkan ke teks bantu permanen (dan hanya di layar yang membuat data), kosongkan di layar masuk`, f);
  });
  Array.from(document.querySelectorAll('a')).filter(visible).forEach((a) => {
    if (a.getClientRects().length > 1 && words(a.textContent) > 1) add('low', 'copy-tautan-terpotong', `tautan terpotong di ujung baris: ${quote(a.textContent)} (beri white-space: nowrap)`, a);
  });
  const bodyText = clean(document.body.innerText);
  const fillerId = /\b(sangat|benar-benar|solusi terbaik|revolusioner|terdepan|powerful|seamless|tanpa ribet|di ujung jari|satu atap|next level|canggih)\b/gi, fillerEn = /\b(very|really|best[- ]in[- ]class|revolutionary|cutting[- ]edge|state[- ]of[- ]the[- ]art|powerful|seamless(ly)?|effortless(ly)?|next[- ]level|game[- ]changing|all[- ]in[- ]one|at your fingertips|world[- ]class|supercharge)\b/gi;
  const filler = [].concat(useId ? bodyText.match(fillerId) || [] : [], useEn ? bodyText.match(fillerEn) || [] : []);
  if (filler.length) add('low', 'copy-kata-kosong', `kata pengisi tanpa informasi: ${Array.from(new Set(filler.map((x) => x.toLowerCase()))).join(', ')}`);
  const bang = (bodyText.match(/!/g) || []).length; if (bang > 2) add('low', 'copy-seru', `${bang} tanda seru di satu layar (maksimal 1)`);
  const longestHeading = hs.reduce((m, h) => Math.max(m, words(h.textContent)), 0);


  // ---- 11. token & hitungan desain (opts.tokens = isi custom properties dari design-tokens.css)
  const rgbKey = (c) => c.slice(0, 3).map(Math.round).join(',');
  const hsl = (c) => { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; return [h, s, l]; };
  const used = new Map(); // rgbKey -> contoh elemen
  const useColor = (c, el) => { if (c[3] < 0.05) return; const k = rgbKey(c); if (!used.has(k)) used.set(k, el); };
  els.forEach((el) => {
    const cs = getComputedStyle(el);
    if (hasText(el)) useColor(toRGBA(cs.color), el);
    useColor(toRGBA(cs.backgroundColor), el);
    if (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') useColor(toRGBA(cs.borderTopColor), el);
  });
  // warna aksen: kelompok hue dari warna jenuh (aksen + warna status)
  const hueB = {}; used.forEach((el, k) => { const c = k.split(',').map(Number); const [h, s, l] = hsl(c); if (s > 0.35 && l > 0.2 && l < 0.85) hueB[Math.round(h / 30) % 12] = 1; });
  const aksen = Object.keys(hueB).length;
  if (aksen > 3) add('medium', 'warna-aksen', `${aksen} kelompok warna jenuh (aksen + status); idealnya 1 aksen ditambah warna status`);
  if (fams.length > 2) add('medium', 'keluarga-huruf', `${fams.length} keluarga huruf (${fams.join(' | ')}); maksimal 2`);
  // kartu seragam berjejer
  let grupKartu = 0, jumlahKartu = 0;
  els.forEach((p) => {
    const kids = Array.from(p.children).filter(visible); if (kids.length < 3) return;
    const boxy = kids.every((k) => { const cs = getComputedStyle(k); return toRGBA(cs.backgroundColor)[3] > 0.05 || (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') || (cs.boxShadow && cs.boxShadow !== 'none'); });
    if (!boxy) return;
    const rs = kids.map((k) => k.getBoundingClientRect());
    if (rs.every((r) => Math.abs(r.width - rs[0].width) <= 2 && Math.abs(r.height - rs[0].height) <= 4)) { grupKartu++; jumlahKartu += kids.length; }
  });
  if (grupKartu >= 2) add('low', 'kartu-seragam', `${grupKartu} grup kartu identik (${jumlahKartu} kartu); pastikan ada hierarki, bukan template (antislop-ui: Copy-Paste Feature Cards)`);
  // persaingan titik fokus di layar pertama
  const cand = textEls.filter((e) => e.getBoundingClientRect().top < vh).map((e) => { const cs = getComputedStyle(e); return { e, s: px(cs.fontSize) * (parseInt(cs.fontWeight, 10) || 400) / 400 }; }).sort((a, b) => b.s - a.s);
  const f1 = cand[0], f2 = cand.find((x) => f1 && x.e !== f1.e && !f1.e.contains(x.e) && !x.e.contains(f1.e));
  if (f1 && f2 && f2.s >= f1.s * 0.9) add('low', 'titik-fokus', `dua kandidat fokus hampir sama kuat di layar pertama: ${sel(f1.e)} vs ${sel(f2.e)}`);
  // luas blok warna jenuh di layar pertama
  let keras = 0; els.forEach((el) => { const c = toRGBA(getComputedStyle(el).backgroundColor); if (c[3] < 0.8) return; const [, s, l] = hsl(c); if (s < 0.35 || l < 0.15 || l > 0.9) return; const pc = el.parentElement && toRGBA(getComputedStyle(el.parentElement).backgroundColor); if (pc && rgbKey(pc) === rgbKey(c)) return; const r = el.getBoundingClientRect(); const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)); keras += w * h; });
  const kerasPct = Math.min(100, Math.round(keras / (vw * vh) * 100));
  if (kerasPct > 40) add('low', 'blok-warna', `${kerasPct}% layar pertama tertutup warna jenuh; pastikan disengaja dan tercatat di DESIGN.md`);
  // kepatuhan token
  const tok = { aktif: false, warnaDiLuar: 0, radiusDiLuar: 0, hurufDiLuar: 0, fontDiLuar: 0 };
  if (opts.tokens && typeof opts.tokens === 'object') {
    tok.aktif = true;
    const rootPx = px(getComputedStyle(document.documentElement).fontSize) || 16;
    const len = (v) => { const m = /^(-?[\d.]+)(px|rem)$/.exec(String(v).trim()); return m ? Number(m[1]) * (m[2] === 'rem' ? rootPx : 1) : null; };
    const tColors = [], tRad = [], tSize = [], tFont = []; let sizeFluid = false;
    Object.entries(opts.tokens).forEach(([k, v]) => {
      v = String(v).trim(); const n = k.toLowerCase();
      if (/^(#|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i.test(v)) { tColors.push(toRGBA(v)); return; }
      const L = len(v);
      if (/radius|round/.test(n)) { if (L != null) tRad.push(L); return; }
      if (/font-?size|^--(fs|text|size|step|type)-/.test(n)) { if (L != null) tSize.push(L); else if (/clamp|calc|vw/.test(v)) sizeFluid = true; return; }
      if (/font|family|^--ff/.test(n) && /[a-z]/i.test(v) && L == null) tFont.push(v.split(',')[0].replace(/["']/g, '').trim().toLowerCase());
    });
    if (tColors.length) {
      const near = (c) => tColors.some((t) => Math.abs(t[0] - c[0]) <= 2 && Math.abs(t[1] - c[1]) <= 2 && Math.abs(t[2] - c[2]) <= 2);
      const off = []; used.forEach((el, k) => { const c = k.split(',').map(Number); if (!near(c)) off.push([k, el]); });
      tok.warnaDiLuar = off.length;
      if (off.length) add('medium', 'token-warna', `${off.length} warna di luar design-tokens.css: ${off.slice(0, 6).map(([k]) => 'rgb(' + k + ')').join(', ')}`, off[0][1]);
    }
    if (tRad.length) {
      const offR = rKeys.map(Number).filter((r) => !tRad.some((t) => Math.abs(t - r) <= 0.5));
      tok.radiusDiLuar = offR.length;
      if (offR.length) add('medium', 'token-radius', `radius di luar token: ${offR.join(', ')}px (token: ${tRad.join(', ')}px)`);
    }
    if (tSize.length >= 3 && !sizeFluid) {
      const offS = sizes.filter((s) => !tSize.some((t) => Math.abs(t - s) <= 0.6));
      tok.hurufDiLuar = offS.length;
      if (offS.length) add('medium', 'token-huruf', `ukuran huruf di luar skala token: ${offS.join(', ')}px`);
    }
    if (tFont.length) {
      const offF = fams.filter((f) => !tFont.includes(f.toLowerCase()));
      tok.fontDiLuar = offF.length;
      if (offF.length) add('medium', 'token-font', `font di luar token: ${offF.join(' | ')}`);
    }
  }

  const count = { high: 0, medium: 0, low: 0 }; issues.forEach((i) => { count[i.sev]++; });
  const ord = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => ord[a.sev] - ord[b.sev]);
  return {
    viewport: { w: vw, h: vh }, counts: count,
    stats: { ukuranHuruf: sizes, keluargaHuruf: fams, nilaiSpasi: spVals.length, spasiDiLuarSkalaPersen: offPct, radius: rKeys.map(Number).sort((a, b) => a - b), bayangan: sKeys.length, warnaTeks: tc, tombolSolidDiLayarPertama: above.length, elemenTerkuat: strong, tepiKiriTerbanyak: leftTop, jumlahGambar: document.querySelectorAll('img').length, kataJudulTerpanjang: longestHeading, jumlahSvg: document.querySelectorAll('svg').length, warnaAksen: aksen, grupKartuSeragam: grupKartu, jumlahKartuSeragam: jumlahKartu, kandidatFokus: f1 ? [sel(f1.e)].concat(f2 ? [sel(f2.e)] : []) : [], blokWarnaJenuhLayarPertamaPersen: kerasPct, token: tok },
    issues: issues.slice(0, 80),
  };
}
if (typeof module !== 'undefined') module.exports = __uiAudit;
