import { createBrowserRouter } from 'react-router';
import { PageHead } from '../ui/screens/AppShell.js';
import { Shell } from './containers/Shell.js';
import { NewRunContainer } from './containers/NewRunContainer.js';
import { ProjectListContainer } from './containers/ProjectListContainer.js';
import { ProjectContainer } from './containers/ProjectContainer.js';

const Stub = ({ title, sub }: { title: string; sub?: string }) => <PageHead title={title} sub={sub} />;
const Soon = ({ title }: { title: string }) => <Stub title={title} sub="Segera hadir (fase 2)" />;

/** Peta rute UX.md bagian 4. Isi layar menyusul per item; sementara halaman kosong bertanda. */
export const routes = [
  {
    element: <Shell />,
    children: [
      { path: '/', element: <ProjectListContainer /> },
      { path: '/baru', element: <NewRunContainer /> },
      { path: '/proyek/:id', element: <ProjectContainer /> },
      { path: '/proyek/:id/review', element: <Stub title="Review" /> },
      { path: '/riwayat', element: <Soon title="Riwayat" /> },
      { path: '/riwayat/banding', element: <Soon title="Banding dua run" /> },
      { path: '/riwayat/:runId', element: <Soon title="Run lama" /> },
      { path: '/kesehatan', element: <Soon title="Kesehatan kit" /> },
      { path: '/kesehatan-kit', element: <Soon title="Kesehatan kit" /> },
      { path: '*', element: <Stub title="Halaman tidak ditemukan" /> },
    ],
  },
];

export const makeRouter = () => createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') });
