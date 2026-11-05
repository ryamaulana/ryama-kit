import type { ReactNode } from 'react';
import { NavRail, type NavRailProps } from './NavRail.js';
import './AppShell.css';

export interface AppShellProps {
  nav: NavRailProps;
  /** Isi layar (Daftar proyek, Layar proyek, ...). */
  children: ReactNode;
  /** Panel samping (mis. Pengaturan); dirender di atas isi, di sisi kanan. */
  panel?: ReactNode;
  skipLabel?: string;
}

/** Kerangka halaman laptop: rel navigasi + area isi. */
export function AppShell({ nav, children, panel, skipLabel = 'Langsung ke isi' }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip" href="#isi">{skipLabel}</a>
      <NavRail {...nav} />
      <main id="isi" className="app-shell__main" tabIndex={-1}>
        {children}
      </main>
      {panel}
    </div>
  );
}

export interface PageHeadProps {
  title: string;
  /** Baris kedua: path relatif, folder kerja, atau ringkasan singkat. */
  sub?: ReactNode;
  subMono?: boolean;
  /** Aksi di kanan kepala halaman. */
  actions?: ReactNode;
}

/** Kepala halaman: judul = nama entitas (UX.md 4, "Di mana saya"). */
export function PageHead({ title, sub, subMono = false, actions }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <h1 className="page-head__title">{title}</h1>
        {sub && <p className={`page-head__sub${subMono ? ' mono' : ''}`}>{sub}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}
