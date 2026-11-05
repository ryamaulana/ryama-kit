import type { MouseEvent, ReactNode } from 'react';
import './NavRail.css';

export type NavDest = 'baru' | 'proyek' | 'riwayat' | 'kesehatan';

export interface NavRailProps {
  /** Tujuan yang sedang dibuka; null bila layar tidak punya tujuan di rel. */
  current?: NavDest | null;
  /** Jumlah "butuh kamu" dari semua proyek; 0 = lencana tidak tampil. */
  needsYou?: number;
  /** href tiap tujuan (bawaan dari UX.md bagian 4). */
  hrefs?: Partial<Record<NavDest, string>>;
  /** Tujuan yang belum ada di fase ini: tampil dengan tanda "segera", tidak bisa dibuka. */
  soon?: NavDest[];
  /** Panel Pengaturan sedang terbuka. */
  settingsOpen?: boolean;
  /** Klik tujuan; fe boleh memanggil event.preventDefault() lalu navigasi lewat router. */
  onNavigate?: (dest: NavDest, event: MouseEvent<HTMLAnchorElement>) => void;
  onOpenSettings?: () => void;
}

const DEFAULT_HREFS: Record<NavDest, string> = { baru: '/baru', proyek: '/', riwayat: '/riwayat', kesehatan: '/kesehatan' };
const DEFAULT_SOON: NavDest[] = ['riwayat', 'kesehatan'];

const svg = (children: ReactNode, strokeWidth = 1.75) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICON: Record<NavDest | 'pengaturan', ReactNode> = {
  baru: svg(<path d="M10 4v12M4 10h12" />, 2),
  proyek: svg(<path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h3.2l1.6 2h6.2A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" />),
  riwayat: svg(<><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></>),
  kesehatan: svg(<path d="M3 15h14M5 15V9M10 15V5M15 15v-4" />),
  pengaturan: svg(<><circle cx="10" cy="10" r="2.5" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" /></>),
};

const LABEL: Record<NavDest, string> = { baru: 'Run baru', proyek: 'Proyek', riwayat: 'Riwayat', kesehatan: 'Kesehatan kit' };

export function NavRail({
  current = null,
  needsYou = 0,
  hrefs,
  soon = DEFAULT_SOON,
  settingsOpen = false,
  onNavigate,
  onOpenSettings,
}: NavRailProps) {
  const href = { ...DEFAULT_HREFS, ...hrefs };

  const item = (dest: NavDest) => {
    const label = LABEL[dest];
    if (soon.includes(dest)) {
      return (
        <li key={dest}>
          <span className="nav-rail__item nav-rail__item--soon" title={`${label}: segera hadir`}>
            {ICON[dest]}
            <span className="nav-rail__soon" aria-hidden="true">segera</span>
            <span className="vh">{label}, segera hadir</span>
          </span>
        </li>
      );
    }
    const badge = dest === 'proyek' && needsYou > 0 ? (needsYou > 9 ? '9+' : String(needsYou)) : null;
    return (
      <li key={dest}>
        <a
          className={`nav-rail__item${dest === 'baru' ? ' nav-rail__item--new' : ''}`}
          href={href[dest]}
          aria-current={current === dest ? 'page' : undefined}
          aria-label={badge ? `${label}, ${needsYou} butuh kamu` : label}
          title={label}
          onClick={(e) => onNavigate?.(dest, e)}
        >
          {ICON[dest]}
          {badge && <span className="nav-rail__badge" aria-hidden="true">{badge}</span>}
        </a>
      </li>
    );
  };

  return (
    <nav className="nav-rail" aria-label="Navigasi utama">
      <ul className="nav-rail__list">
        {item('baru')}
        {item('proyek')}
        {item('riwayat')}
        {item('kesehatan')}
      </ul>
      <button
        type="button"
        className="nav-rail__item nav-rail__settings"
        aria-label="Pengaturan"
        aria-expanded={settingsOpen}
        title="Pengaturan"
        onClick={onOpenSettings}
      >
        {ICON.pengaturan}
      </button>
    </nav>
  );
}
