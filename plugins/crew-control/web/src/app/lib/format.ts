import { countTokens } from '../../../../src/contract/common.js';

export { countTokens };
const num = new Intl.NumberFormat('id-ID');
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (n: number): string => num.format(n);
/** Token ringkas: 78400 -> "78,4 rb"; di bawah 1000 apa adanya. */
export const formatTokens = (n: number): string => (n < 1000 ? num.format(n) : compact.format(n).replace(/ /g, ' '));

/** Durasi: "45 dtk", "2 mnt 5 dtk", "1 j 5 mnt" (dua satuan terbesar). */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} dtk`;
  if (s < 3600) return `${Math.floor(s / 60)} mnt${s % 60 ? ` ${s % 60} dtk` : ''}`;
  const m = Math.floor((s % 3600) / 60);
  return `${Math.floor(s / 3600)} j${m ? ` ${m} mnt` : ''}`;
}
