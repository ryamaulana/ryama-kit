// [SEC] Penjaga lokal: Host/Origin, parameter p/id, path statis, header, batas body. Fungsi murni kecuali readBody.
// Galat dikembalikan sebagai {status, code, message}; server.js mengirimnya sebagai {"error":code,"message":message}.

const path = require('path');

const LOCAL_HOSTS =['localhost', '127.0.0.1', '[::1]'];
const SAFE_METHODS = new Set(['GET', 'HEAD']);

function err(status, code, message) {
  return { status, code, message };
}

// Anti DNS rebinding: hanya Host lokal dengan port viewer.
function hostOk(host, port) {
  if (typeof host !== 'string') return false;
  return LOCAL_HOSTS.some((h) => host.toLowerCase() === `${h}:${port}`);
}

/** null bila boleh lanjut, atau {status:403, code:'bad_host'|'bad_origin', message}. */
function checkRequest(req, port) {
  const h = req.headers || {};
  if (!hostOk(h.host, port)) return err(403, 'bad_host', 'Host tidak dikenal.');
  if (SAFE_METHODS.has(req.method)) return null;
  // Anti CSRF: hook dan skrip uji tidak mengirim Origin; browser selalu mengirimnya pada POST.
  if (h.origin !== undefined && h.origin !== `http://${h.host.toLowerCase()}`) return err(403, 'bad_origin', 'Asal permintaan ditolak.');
  const site = h['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return err(403, 'bad_origin', 'Asal permintaan ditolak.');
  return null;
}

const P_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/** ?p=: null bila tidak ada (proyek terbaru), string bila sah, false bila salah bentuk (400 bad_project). */
function parseP(s) {
  if (s === undefined || s === null || s === '') return null;
  return typeof s === 'string' && P_RE.test(s) ? s : false;
}

const ID_RE = /^[a-z0-9][a-z0-9:._-]{0,63}$/;
const SPECIAL_IDS = new Set(['__main', '__all', '__convo']);

/** ?id= di /detail: string bila sah, null bila tidak ada/salah bentuk (400 bad_id). Pakai sebagai kunci Map, bukan path. */
function parseNodeId(s) {
  if (typeof s !== 'string') return null;
  return SPECIAL_IDS.has(s) || ID_RE.test(s) ? s : null;
}

const DEFAULT_PUBLIC = path.join(__dirname, 'public');
// Whitelist ekstensi sekaligus tipe konten; ekstensi lain = 404.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Path URL (tanpa query) -> {file, type} di dalam publicDir, atau null (404). Belum memeriksa file ada. */
function staticPath(urlPath, publicDir = DEFAULT_PUBLIC) {
  if (typeof urlPath !== 'string') return null;
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  // ':' menolak huruf drive dan NTFS alternate data stream di Windows.
  if (/[\0\\:]/.test(p) || p.includes('..')) return null;
  const root = path.resolve(publicDir);
  const file = path.resolve(root, '.' + p);
  if (!file.startsWith(root + path.sep)) return null;
  const type = TYPES[path.extname(file).toLowerCase()];
  return type ? { file, type } : null;
}

// Dipasang di setiap respons. Tanpa header CORS: baca lintas-origin diblokir browser.
// style-src mengizinkan inline (atribut style dari JS); skrip inline tetap dilarang.
const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
});

const MAX_BODY = 4 * 1024 * 1024;

/** Baca body sebagai UTF-8. Ditolak {status:413, code:'too_large'} bila > max; sisa body dibuang, tidak disimpan. */
function readBody(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const tooLarge = () => err(413, 'too_large', 'Body lebih dari 4 MB.');
    if (Number(req.headers && req.headers['content-length']) > max) {
      req.resume();
      return reject(tooLarge());
    }
    const chunks = [];
    let size = 0;
    let over = false;
    req.on('data', (c) => {
      if (over) return;
      size += c.length;
      if (size > max) { over = true; chunks.length = 0; reject(tooLarge()); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!over) resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

module.exports = { checkRequest, parseP, parseNodeId, staticPath, readBody, SECURITY_HEADERS, MAX_BODY };
