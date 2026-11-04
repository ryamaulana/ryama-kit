// Kendali hanya dari localhost atau Tailscale (PRD bagian 8). Tiga lapis: alamat peer, header Host (anti DNS-rebinding),
// dan Origin/Content-Type untuk permintaan yang mengubah sesuatu (anti CSRF dari halaman web lain).
import net from 'node:net';

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
