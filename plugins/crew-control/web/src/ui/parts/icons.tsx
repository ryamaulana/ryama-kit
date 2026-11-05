import type { ReactNode } from 'react';

const svg = (children: ReactNode, box = 16, strokeWidth = 1.75) => (
  <svg viewBox={`0 0 ${box} ${box}`} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** Satu set ikon garis 1,75 (sama dengan NavRail). */
export const Icon = {
  close: () => svg(<path d="M4 4l8 8M12 4l-8 8" />),
  alert: () => svg(<><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5v4M8 11v.5" /></>),
  warn: () => svg(<><path d="M8 2l6.5 11.5h-13z" /><path d="M8 6.5v3M8 11.5v.2" /></>),
  check: () => svg(<path d="M3.5 8.5l3 3 6-7" />),
  chevronDown: () => svg(<path d="M4.5 6.5L8 10l3.5-3.5" />),
  chevronRight: () => svg(<path d="M6.5 4.5L10 8l-3.5 3.5" />),
  folder: () => svg(<path d="M2.5 5a1 1 0 0 1 1-1h2.8l1.3 1.6h4.9a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />),
  search: () => svg(<><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>),
  plus: () => svg(<path d="M8 3.5v9M3.5 8h9" />),
  settings: () => svg(<><circle cx="10" cy="10" r="2.5" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" /></>, 20),
};
