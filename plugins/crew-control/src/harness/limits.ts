import { spawn } from 'node:child_process';
import type { HarnessOptions, Live } from './session.js';

// Batas bawaan: jumlah run aktif, jeda penutupan sesi, dan waktu henti paksa.
export const LIMIT_DEFAULTS = { bin: 'claude', binArgs: [] as string[], maxRuns: 1, stopSoftMs: 3000, stopKillMs: 6000 };
export type ResolvedOptions = Required<Omit<HarnessOptions, 'store' | 'hookBaseUrl'>> & Pick<HarnessOptions, 'store' | 'hookBaseUrl'>;

export type LimitHit = { resetAt: string | null };
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);
const LIMIT_TEXT = /\bhit your [\w ]*limit\b|\busage limit reached\b/i;

/**
 * Mengenali galat batas pemakaian dari satu event stream-json `claude` (fixture: test/fixtures/limits/).
 * Hasil: null bila bukan limit; `{ resetAt }` (ISO UTC, atau null bila jam reset tak terbaca) bila limit.
 * Teks agent biasa yang mengutip pesan limit tidak dihitung: hanya assistant sintetis/galat, result galat, atau rate_limit_event rejected.
 */
export function detectLimit(event: unknown, now: Date = new Date()): LimitHit | null {
  const e = obj(event);
  if (!e) return null;
  if (e.type === 'rate_limit_event') {
    const info = obj(e.rate_limit_info);
    if (info?.status !== 'rejected') return null;
    return { resetAt: fromEpoch(info.resetsAt) };
  }
  let text: string | null = null;
  if (e.type === 'result' && e.is_error === true && typeof e.result === 'string') text = e.result;
  if (e.type === 'assistant') {
    const m = obj(e.message);
    if (e.error !== 'rate_limit' && m?.model !== '<synthetic>') return null;
    const parts = Array.isArray(m?.content) ? m.content : [];
    text = parts.map((p) => (obj(p)?.type === 'text' && typeof obj(p)?.text === 'string' ? obj(p)!.text : '')).join('\n');
  }
  if (!text || !LIMIT_TEXT.test(text)) return null;
  return { resetAt: parseReset(text, now) };
}

function fromEpoch(v: unknown): string | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n < 1e12 ? n * 1000 : n); // detik (format CLI) atau milidetik
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseReset(text: string, now: Date): string | null {
  const epoch = /\|\s*(\d{9,13})\b/.exec(text);
  if (epoch) return fromEpoch(epoch[1]);
  // "resets 5pm (Zona)" atau "resets 12:10am (Zona)"; format lain (mis. dengan tanggal) sengaja tidak ditebak.
  const m = /\bresets (\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\(([^()]+)\)/i.exec(text);
  if (!m) return null;
  const h12 = Number(m[1]), min = Number(m[2] ?? 0);
  if (h12 < 1 || h12 > 12 || min > 59) return null;
  const hour = (h12 % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0);
  return nextWallTime(hour, min, m[4].trim(), now);
}

/** Kejadian berikutnya (setelah now) dari jam dinding hour:min di zona IANA; null bila zona tak dikenal. */
function nextWallTime(hour: number, min: number, zone: string, now: Date): string | null {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  } catch {
    return null;
  }
  const wall = (t: number) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  };
  const today = new Date(wall(now.getTime()));
  for (let add = 0; add <= 2; add++) {
    const target = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + add, hour, min);
    let t = target - (wall(target) - target);
    t = target - (wall(t) - t); // koreksi sekali untuk pergantian DST
    if (t > now.getTime()) return new Date(t).toISOString();
  }
  return null;
}

export function killTree(l: Live): void {
  if (l.exited || !l.child.pid) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(l.child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => l.child.kill());
  else l.child.kill('SIGKILL');
}
