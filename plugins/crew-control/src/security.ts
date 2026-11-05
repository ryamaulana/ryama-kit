// Kendali hanya dari localhost atau Tailscale (PRD bagian 8). Tiga lapis: alamat peer, header Host (anti DNS-rebinding),
// dan Origin/Content-Type untuk permintaan yang mengubah sesuatu (anti CSRF dari halaman web lain).
import net from 'node:net';
import type { FastifyInstance, FastifyReply } from 'fastify';

const stripV4Mapped = (a: string) => a.replace(/^::ffff:/i, '');

export function isLoopback(addr: string | undefined): boolean {
  if (!addr) return false;
  const a = stripV4Mapped(addr);
  return a === '::1' || (net.isIPv4(a) && a.startsWith('127.'));
}

/** Loopback, Tailscale IPv4 (100.64.0.0/10) atau IPv6 (fd7a:115c:a1e0::/48). */
export function isAllowedPeer(addr: string | undefined): boolean {
  if (!addr) return false;
  if (isLoopback(addr)) return true;
  const a = stripV4Mapped(addr);
  if (net.isIPv4(a)) {
    const [o1, o2] = a.split('.').map(Number);
    return o1 === 100 && o2 >= 64 && o2 <= 127;
  }
  return a.toLowerCase().startsWith('fd7a:115c:a1e0:');
}

function hostnameOf(hostHeader: string): string {
  const h = hostHeader.trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(1, h.indexOf(']')); // [::1]:4780
  return h.replace(/:\d+$/, '');
}

export function isAllowedHost(hostHeader: string | undefined, extra: string[] = []): boolean {
  if (!hostHeader) return false;
  const h = hostnameOf(hostHeader);
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (h.endsWith('.ts.net')) return true;
  if (net.isIP(h) && isAllowedPeer(h)) return true;
  return extra.map((e) => e.toLowerCase()).includes(h);
}

/** Origin harus sama dengan Host permintaan, atau ada di daftar yang dipercaya (mis. proxy dev Vite). */
export function isAllowedOrigin(origin: string, hostHeader: string | undefined, extraOrigins: string[] = []): boolean {
  if (extraOrigins.includes(origin)) return true;
  try {
    return !!hostHeader && new URL(origin).host.toLowerCase() === hostHeader.toLowerCase();
  } catch {
    return false;
  }
}

// ---- sc01: pengguna Tailscale, CSP, batas laju (ARCHITECTURE 6.1 dan 10) ----

/** CSP aplikasi (ARCHITECTURE 10). Inline style dibutuhkan kanvas peta dan Mermaid. */
export const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'";

/**
 * Bila daftar diisi: peer non-loopback ditolak (header bisa dipalsukan, termasuk Host 127.0.0.1 dari peer tailnet);
 * peer loopback dengan Host loopback diterima (laptop sendiri); Host lain (*.ts.net, IP Tailscale, dll.)
 * wajib Tailscale-User-Login yang terdaftar (tailscale serve memproksi dari localhost).
 */
export function isAllowedTailscaleUser(hostHeader: string | undefined, login: string | undefined, peer: string | undefined, users: string[]): boolean {
  if (!users.length) return true;
  if (!isLoopback(peer)) return false;
  const h = hostHeader ? hostnameOf(hostHeader) : '';
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  const l = (login ?? '').trim().toLowerCase();
  return !!l && users.some((u) => u.trim().toLowerCase() === l);
}

/** Jendela bergeser per kunci. Mengembalikan false bila kunci sudah mencapai `max` dalam `windowMs` terakhir. */
export function createRateLimiter(max = 60, windowMs = 60_000, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    const allowed = recent.length < max;
    if (allowed) recent.push(t);
    if (recent.length) hits.set(key, recent); else hits.delete(key);
    return allowed;
  };
}

/** Dipasang setelah lapisan peer/Host/Origin di server.ts. Hook claude (/hook/, loopback + token) tidak dibatasi laju. */
export function installNetworkSecurity(app: FastifyInstance, o: { tailscaleUsers?: string[] } = {}) {
  const allow = createRateLimiter();
  const deny = (reply: FastifyReply, status: number, code: string, message: string) => reply.code(status).send({ error: { code, message } });
  app.addHook('onRequest', async (req, reply) => {
    const login = req.headers['tailscale-user-login'];
    if (!isAllowedTailscaleUser(req.headers.host, Array.isArray(login) ? login[0] : login, req.socket.remoteAddress, o.tailscaleUsers ?? [])) {
      return deny(reply, 403, 'forbidden_user', 'Pengguna Tailscale tidak diizinkan.');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD' && !req.url.startsWith('/hook/') && !allow(stripV4Mapped(req.socket.remoteAddress ?? ''))) {
      return deny(reply, 429, 'rate_limited', 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.');
    }
  });
  app.addHook('onSend', async (_req, reply, payload) => {
    if (String(reply.getHeader('content-type') ?? '').startsWith('text/html')) reply.header('content-security-policy', CSP);
    return payload;
  });
}
