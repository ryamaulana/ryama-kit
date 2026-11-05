import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Project } from '../../../../src/contract/projects.js';
import type { Team } from '../../../../src/contract/teams.js';
import { PageHead } from '../../ui/screens/AppShell.js';
import { ProjectView } from '../../ui/project/ProjectView.js';
import { api, ApiError } from '../api.js';
import { useRunStream } from '../hooks/useRunStream.js';
import { agentStates } from '../lib/agentStates.js';
import { agentRows, phaseOf, topBarStats } from '../lib/projectScreen.js';
import { allowedActions } from '../lib/runState.js';
import { toDetailData } from '../lib/agentDetail.js';
import type { AgentDetail as AgentDetailResp } from '../../../../src/contract/messages.js';
import { ChatPanel, type SideTab } from '../../ui/chat/ChatPanel.js';
import { AgentDetail } from '../../ui/chat/AgentDetail.js';
import { FlowMap } from './FlowMap.js';

const NOOP_ACTIONS = { answerQuestion() {}, allow() {}, deny() {}, always() {}, approveMilestone() {}, editMilestone() {}, answerDecision() {} };

/** Layar proyek /proyek/:id: run aktif atau terakhir lewat SSE. Peta dan Chat menyusul (item lain). UX 6.2. */
export function ProjectContainer() {
  const { id = '' } = useParams();
  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => api<Project>('GET', `/api/projects/${encodeURIComponent(id)}`), refetchOnWindowFocus: true });
  const project = projectQ.data;
  const { state, status } = useRunStream(project?.latestRunId ?? null);
  const run = state.run;
  const teamId = (run as { teamId?: string | null } | null)?.teamId ?? project?.teamId ?? null;
  const teamQ = useQuery({ queryKey: ['team', teamId], queryFn: () => api<Team>('GET', `/api/teams/${teamId}`), enabled: !!teamId });

  const [now, setNow] = useState(() => Date.now());
  const [stopOpen, setStopOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<SideTab>('chat');
  const pick = (aid: string) => { setSelected(aid); setTab('detail'); };
  const detailQ = useQuery({
    queryKey: ['agent', run?.id, selected], enabled: !!run && !!selected,
    queryFn: () => api<AgentDetailResp>('GET', `/api/runs/${run!.id}/agents/${encodeURIComponent(selected!)}`),
    refetchInterval: 5000,
  });
  const live = run && phaseOf(run) !== 'stopped';
  useEffect(() => { if (!live) return; const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, [live]);

  const control = useMutation({
    mutationFn: (action: 'pause' | 'resume' | 'stop') => api('POST', `/api/runs/${run!.id}/${action}`),
    onSettled: () => setStopOpen(false),
  });

  const agents = useMemo(() => {
    const team = teamQ.data ?? ({ agents: [], flow: { nodes: [], edges: [] } } as unknown as Team);
    return agentRows(agentStates(team, state.activities, state.messages, run), state.activities);
  }, [teamQ.data, state.activities, state.messages, run]);

  if (!project && projectQ.isPending) return <><PageHead title="Proyek" /><p role="status">Memuat proyek…</p></>;
  if (!project) {
    const gone = projectQ.error instanceof ApiError && projectQ.error.status === 404;
    return (
      <><PageHead title="Proyek" />
        <div role="alert">
          <p>{gone ? 'Proyek ini tidak ditemukan.' : projectQ.error.message}</p>
          {gone ? <Link to="/">Kembali ke daftar proyek</Link> : <button type="button" className="btn" onClick={() => projectQ.refetch()}>Coba lagi</button>}
        </div></>
    );
  }
  if (!project.latestRunId) {
    return <><PageHead title={project.name} sub={project.relPath} subMono /><p>Belum ada run di proyek ini.</p><Link to="/baru">Mulai run baru</Link></>;
  }
  if (!run) {
    return (
      <><PageHead title={project.name} sub={project.relPath} subMono />
        <p role="status">{status === 'reconnecting' ? 'Menyambung ulang ke server…' : 'Memuat run…'}</p></>
    );
  }

  const row = agents.find((a) => a.id === selected);
  const detailPane = !selected || !row ? <AgentDetail agent={null} />
    : detailQ.data ? <AgentDetail agent={toDetailData(row, detailQ.data)} />
    : detailQ.isError ? <div role="alert"><p>{detailQ.error.message}</p><button type="button" className="btn" onClick={() => detailQ.refetch()}>Coba lagi</button></div>
    : <p role="status">Memuat detail agent…</p>;
  const phase = phaseOf(run);
  const stats = topBarStats(run, now);
  const can = allowedActions(run.status, run.sessionId);
  const desktop = (run as { origin?: string }).origin === 'desktop';
  const ask = (a: 'pause' | 'resume' | 'stop') => control.mutate(a);
  return (
    <>
      {status === 'reconnecting' && <p role="status">Koneksi terputus, menyambung ulang…</p>}
      {control.isError && <p role="alert">{control.error.message}</p>}
      <ProjectView
        topBar={{
          name: project.name, path: project.relPath, phase,
          statusText: desktop ? 'Dari desktop' : undefined,
          milestone: stats.milestone, freeText: stats.milestone ? undefined : (run as { title?: string }).title ?? run.prompt,
          tokens: stats.tokens, duration: stats.duration, waiting: stats.waiting,
          onPause: can.pause && !desktop ? () => ask('pause') : undefined,
          onResume: can.resume && !desktop ? () => ask('resume') : undefined,
          stopOpen, onStopRequest: () => setStopOpen(true), onStopCancel: () => setStopOpen(false), onStopConfirm: () => ask('stop'),
        }}
        agents={{ agents, selectedId: selected, onSelect: pick }}
        map={teamQ.data
          ? <FlowMap flow={teamQ.data.flow} rows={agents} selectedId={selected} onSelect={pick} />
          : teamQ.isError ? <p role="alert">Alur tim tidak bisa dimuat. <button type="button" className="btn" onClick={() => teamQ.refetch()}>Coba lagi</button></p> : <p role="status">Memuat alur tim…</p>}
        chat={
          // Isi Chat menyusul (item ch04): daftar kosong, kotak ketik disembunyikan lewat banner.
          <ChatPanel tab={tab} onTabChange={setTab} items={[]} waiting={stats.waiting} readOnly="Chat belum tersedia di versi ini."
            actions={NOOP_ACTIONS} composer={{ mode: 'run', value: '', onChange: () => {}, onSend: () => {} }}
            detail={detailPane} />
        }
      />
    </>
  );
}
