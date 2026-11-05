import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectListView } from '../../ui/screens/ProjectListView.js';
import { PageHead } from '../../ui/screens/AppShell.js';
import { api } from '../api.js';
import { useProjects } from '../hooks/useProjects.js';
import { formatWhen, groupBoard } from '../lib/projectList.js';

/** Daftar proyek (/): polling 3 dtk, aksi satu klik. UX.md 6.1. */
export function ProjectListContainer() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useProjects();
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const g = useMemo(() => (q.data ? groupBoard(q.data) : null), [q.data]);

  // Galat muat pertama: tidak ada data lama untuk ditampilkan.
  if (q.isError && !q.data) {
    return (
      <>
        <PageHead title="Proyek" />
        <p role="alert">Tidak bisa memuat daftar proyek. {(q.error as Error).message}</p>
        <button className="btn" type="button" onClick={() => q.refetch()}>Coba lagi</button>
      </>
    );
  }
  const empty = q.data && q.data.projects.length === 0;
  const resume = async (id: string) => {
    const run = q.data?.projects.find((p) => p.id === id)?.latestRunId;
    if (!run) return;
    setResumingId(id);
    try {
      await api('POST', `/api/runs/${encodeURIComponent(run)}/continue`);
      await qc.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/proyek/${id}`);
    } catch (e) {
      setAnnounce(`Tidak bisa melanjutkan: ${(e as Error).message}`);
    } finally { setResumingId(null); }
  };
  return (
    <ProjectListView
      status={!g ? 'loading' : empty ? 'empty' : 'ready'}
      totals={g?.totals ?? { needsYou: 0, readyReview: 0, active: 0, maxRuns: 0, failed: 0, limitPaused: 0 }}
      attention={g?.attention ?? []} running={g?.running ?? []} limited={g?.limited ?? []} quiet={g?.quiet ?? []}
      staleAt={q.isError && q.data ? formatWhen(new Date(q.dataUpdatedAt).toISOString()) : null}
      onRetry={() => q.refetch()}
      resumingId={resumingId} onResume={resume} announce={announce}
      onOpen={(href, e) => { e.preventDefault(); navigate(href); }}
    />
  );
}
