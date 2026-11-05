// Data contoh + peta/Chat tiruan untuk pratinjau Layar proyek (rangka). Peta dan Chat sungguhan adalah item berikutnya.
import { useState } from 'react';
import { ProjectView } from '../project/ProjectView.js';
import { Sep } from '../parts/Sep.js';
import { Station } from '../project/Station.js';
import { RailMap, type RailStage } from '../project/RailMap.js';
import type { AgentRow } from '../project/AgentColumn.js';
import type { TopBarProps, RunPhase } from '../project/TopBar.js';
import { ChatDemo } from './chatDemo.js';

export const heavyAgents: AgentRow[] = [
  { id: 'ui-designer', name: 'ui-designer', status: 'ask', item: 'Pertanyaan menunggu di Chat' },
  { id: 'fe', name: 'fe', status: 'run', statusText: 'Jalan · putaran 3', item: 'Kerangka layar Riwayat' },
  { id: 'be', name: 'be', status: 'run', statusText: 'Jalan · putaran 2', item: 'Paginasi daftar run' },
  { id: 'prd', name: 'prd', status: 'done' }, { id: 'ux', name: 'ux', status: 'done' },
  { id: 'architect', name: 'architect', status: 'done' }, { id: 'backlog', name: 'backlog', status: 'done' },
  { id: 'ui-critic', name: 'ui-critic', status: 'ready' }, { id: 'qa', name: 'qa', status: 'ready' }, { id: 'cyber', name: 'cyber', status: 'ready' },
];
export const sandboxAgents: AgentRow[] = [
  { id: 'orkestrator', name: 'orkestrator', status: 'ready', statusText: 'Dihentikan' },
];
export const statusSix: AgentRow[] = [
  { id: 'a', name: 'orkestrator', status: 'ask', item: 'Pertanyaan warna' },
  { id: 'b', name: 'fe', status: 'run', statusText: 'Jalan · putaran 1', item: 'Form login' },
  { id: 'c', name: 'be', status: 'bad', item: 'Tes rekap gagal' },
  { id: 'd', name: 'prd', status: 'done' }, { id: 'e', name: 'qa', status: 'ready' }, { id: 'f', name: 'cyber', status: 'skipped' },
];

function HeavyMap() {
  return (
    <svg viewBox="0 0 712 384" role="img" aria-label="Alur tim: prd, ux, architect, backlog selesai; ui-designer butuh kamu; fe dan be jalan bersamaan; ui-critic, qa, cyber siap.">
      <path className="trk done" d="M64 60 H616 A32 32 0 0 1 648 92 V136 A32 32 0 0 1 616 168 H56 A32 32 0 0 0 24 200 V240 A32 32 0 0 0 56 272 H140" />
      <path className="trk live" d="M140 272 C168 272 168 244 196 244 H248" />
      <path className="trk live" d="M140 272 C168 272 168 300 196 300 H248" />
      <path className="trk todo" d="M256 244 H316 C344 244 344 272 372 272 M256 300 H316 C344 300 344 272 372 272 H640" />
      <circle className="train" cx="196" cy="244" r="3" />
      <circle className="train b" cx="196" cy="300" r="3" />
      <Station x={64} y={60} status="done" name="prd" />
      <Station x={192} y={60} status="done" name="ux" />
      <Station x={320} y={60} status="done" name="architect" />
      <Station x={448} y={60} status="done" name="backlog" />
      <Station x={96} y={272} status="ask" name="ui-designer" />
      <Station x={256} y={244} status="run" name="fe" statusText="Jalan · putaran 3" tool="Write RiwayatList.tsx" labelAbove />
      <Station x={256} y={300} status="run" name="be" statusText="Jalan · putaran 2" tool="Bash npm test -- runs" />
      <Station x={416} y={272} status="ready" name="ui-critic" />
      <Station x={528} y={272} status="ready" name="qa" />
      <Station x={640} y={272} status="ready" name="cyber" />
    </svg>
  );
}

/** Data contoh 12 agent (tim Fullstack + docs, release). */
export const twelveStages: RailStage[] = [
  [{ id: 'prd', name: 'prd', status: 'done' }], [{ id: 'ux', name: 'ux', status: 'done' }],
  [{ id: 'architect', name: 'architect', status: 'done' }], [{ id: 'backlog', name: 'backlog', status: 'done' }],
  [{ id: 'ui-designer', name: 'ui-designer', status: 'ask' }],
  [{ id: 'fe', name: 'fe', status: 'run', statusText: 'Jalan · putaran 3', tool: 'Write RiwayatList.tsx' },
   { id: 'be', name: 'be', status: 'run', statusText: 'Jalan · putaran 2', tool: 'Bash npm test -- runs' }],
  [{ id: 'ui-critic', name: 'ui-critic', status: 'ready' }], [{ id: 'qa', name: 'qa', status: 'ready' }],
  [{ id: 'cyber', name: 'cyber', status: 'ready' }], [{ id: 'docs', name: 'docs', status: 'ready' }],
  [{ id: 'release', name: 'release', status: 'ready' }],
];
const twelveAgents: AgentRow[] = twelveStages.flat().map((n) => ({ id: n.id, name: n.name, status: n.status, statusText: n.statusText,
  item: n.id === 'ui-designer' ? 'Pertanyaan menunggu di Chat' : n.id === 'fe' ? 'Kerangka layar Riwayat' : n.id === 'be' ? 'Paginasi daftar run' : undefined }));

function SandboxMap() {
  return (
    <svg viewBox="0 0 712 160" role="img" aria-label="Alur: orkestrator dihentikan.">
      <path className="trk live" d="M96 80 H300" />
      <Station x={96} y={80} status="ready" name="orkestrator" statusText="Dihentikan" />
    </svg>
  );
}

const nav = { onNavigate: (_d: unknown, e: { preventDefault(): void }) => e.preventDefault() };
export { nav as projectNav };

/** keadaan: (kosong = jalan, berat) | menunggu | jeda | henti | stop | enam */
export function ProjectDemo({ keadaan }: { keadaan: string }) {
  const [stopOpen, setStopOpen] = useState(keadaan === 'stop');
  const [phase, setPhase] = useState<RunPhase>(keadaan === 'jeda' ? 'paused' : keadaan === 'henti' ? 'stopped' : 'run');
  const sandbox = keadaan === 'henti';
  const six = keadaan === 'enam';
  const peta = keadaan === 'peta' || keadaan === 'kosong';
  const empty = keadaan === 'kosong';
  const [sel, setSel] = useState<string | null>(null);
  const topBar: TopBarProps = empty
    ? { name: 'toconnect', path: 'clients › toconnect', sampleLabel: 'Data contoh', phase }
    : sandbox
    ? { name: '07_Sandbox', path: '07_Sandbox', phase, freeText: 'Prompt bebas · 9 langkah', tokens: '1,2 rb token', duration: '2 mnt 9 dtk' }
    : {
        name: 'toconnect', path: 'clients › toconnect', sampleLabel: 'Data contoh', phase,
        milestone: { name: 'UI', done: 7, total: 24, now: 2, batch: 'batch 2' },
        tokens: '412,6 rb token', duration: '1 j 48 mnt', waiting: 1, onJumpWaiting: () => setSel('ui-designer'),
      };
  return (
    <ProjectView
      phase={phase}
      topBar={{
        ...topBar, stopOpen,
        onPause: () => setPhase('paused'), onResume: () => setPhase('run'),
        onStopRequest: () => setStopOpen(true), onStopCancel: () => setStopOpen(false),
        onStopConfirm: () => { setStopOpen(false); setPhase('stopped'); },
      }}
      agents={{
        agents: sandbox ? sandboxAgents : six ? statusSix : peta ? (empty ? twelveAgents.map((a) => ({ id: a.id, name: a.name, status: 'ready' as const })) : twelveAgents) : heavyAgents, selectedId: sel, onSelect: setSel,
        teamNote: <>Tim <b>Fullstack</b><Sep />Lanjut backlog<br />Orkestrator <b>Sonnet</b></>,
      }}
      mapNote={sandbox || empty ? undefined : 'Batch 2 · fe dan be jalan bersamaan'}
      mapCaption={sandbox || empty ? undefined : 'Data contoh untuk keadaan berat, bukan run asli.'}
      map={sandbox ? <SandboxMap /> : peta ? <RailMap stages={twelveStages} empty={empty} onStart={() => undefined} /> : <HeavyMap />}
      chat={<ChatDemo key={phase} agentId={sel} mode={phase === 'paused' ? 'paused' : phase === 'stopped' ? 'stopped' : 'run'} />}
    />
  );
}
