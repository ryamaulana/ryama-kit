import type { ReactNode } from 'react';
import { Sep } from '../parts/Sep.js';
import type { NavDest, NavRailProps } from './NavRail.js';
import './TabBar.css';

const svg = (d: string, strokeWidth = 1.75) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICON: Partial<Record<NavDest, ReactNode>> = {
  proyek: svg('M3 6.5a1.5 1.5 0 0 1 1.5-1.5h3.2l1.6 2h6.2A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z'),
  baru: svg('M10 4v12M4 10h12', 2),
  riwayat: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></svg>
  ),
};
const LABEL: Partial<Record<NavDest, string>> = { proyek: 'Proyek', baru: 'Run baru', riwayat: 'Riwayat' };
const HREF: Record<NavDest, string> = { baru: '/baru', proyek: '/', riwayat: '/riwayat', kesehatan: '/kesehatan' };
const ORDER: NavDest[] = ['proyek', 'baru', 'riwayat'];

/** Tab bawah HP (< 900 px, UX.md 4): Proyek, Run baru, Riwayat. Kesehatan kit tidak ada di HP. */
export function TabBar({ current = null, needsYou = 0, hrefs, soon = ['riwayat', 'kesehatan'], onNavigate }: NavRailProps) {
  const href = { ...HREF, ...hrefs };
  return (
    <nav className="tab-bar" aria-label="Navigasi utama HP">
      {ORDER.map((dest) => {
        const label = LABEL[dest]!;
        if (soon.includes(dest)) {
          return (
            <span key={dest} className="tab-bar__item tab-bar__item--soon">
              {ICON[dest]}
              <span aria-hidden="true">{label}<Sep />segera</span>
              <span className="vh">{label}, segera hadir</span>
            </span>
          );
        }
        const badge = dest === 'proyek' && needsYou > 0;
        return (
          <a
            key={dest}
            className="tab-bar__item"
            href={href[dest]}
            aria-current={current === dest ? 'page' : undefined}
            aria-label={badge ? `${label}, ${needsYou} butuh kamu` : undefined}
            onClick={(e) => onNavigate?.(dest, e)}
          >
            {ICON[dest]}
            <span aria-hidden={badge || undefined}>{label}</span>
            {badge && <span className="tab-bar__badge" aria-hidden="true">{needsYou > 9 ? '9+' : needsYou}</span>}
          </a>
        );
      })}
    </nav>
  );
}
