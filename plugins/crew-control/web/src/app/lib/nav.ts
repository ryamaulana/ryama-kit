// Salinan tipe NavRail agar lib murni tidak menarik .tsx ke tes (tsc akar tanpa --jsx).
type NavDest = 'baru' | 'proyek' | 'riwayat' | 'kesehatan';

/** Tujuan yang baru ada di fase 2: tampil "segera" di rel dan membuka halaman "Segera hadir". */
export const SOON_DESTS: NavDest[] = ['riwayat', 'kesehatan'];
export const isSoon = (dest: NavDest) => SOON_DESTS.includes(dest);

/** Tujuan rel untuk sebuah path (UX.md bagian 4); null bila tidak punya tujuan (mis. Pengaturan). */
export function destForPath(pathname: string): NavDest | null {
  const first = pathname.split('/')[1] ?? '';
  switch (first) {
    case '': case 'proyek': return 'proyek';
    case 'baru': return 'baru';
    case 'riwayat': return 'riwayat';
    case 'kesehatan': return 'kesehatan';
    default: return null;
  }
}
