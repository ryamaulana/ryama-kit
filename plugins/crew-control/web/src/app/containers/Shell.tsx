import { Outlet, useLocation, useNavigate } from 'react-router';
import { AppShell } from '../../ui/screens/AppShell.js';
import { destForPath, SOON_DESTS } from '../lib/nav.js';
import { useProjects } from '../hooks/useProjects.js';
import { useSettings } from '../hooks/useSettings.js';

/** Kerangka bersama semua rute: rel navigasi + isi. */
export function Shell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const needsYou = useProjects().data?.totals.needsOwner ?? 0;
  useSettings(); // menerapkan tema sejak render pertama
  return (
    <AppShell
      nav={{
        current: destForPath(pathname),
        soon: SOON_DESTS,
        needsYou,
        onNavigate: (dest, e) => {
          e.preventDefault();
          navigate(({ baru: '/baru', proyek: '/', riwayat: '/riwayat', kesehatan: '/kesehatan' })[dest]);
        },
      }}
    >
      <Outlet />
    </AppShell>
  );
}
