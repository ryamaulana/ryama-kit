import type { AgentStatus } from '../parts/StatusDot.js';
import { STATUS_TEXT } from '../parts/StatusDot.js';
import { Station } from './Station.js';
import './RailMap.css';

export interface RailNode {
  id: string;
  name: string;
  status: AgentStatus;
  /** Kata status di bawah nama; bawaan dari status. Mis. "Jalan · putaran 3". */
  statusText?: string;
  /** Satu baris langkah alat (mono) untuk agent Jalan. */
  tool?: string;
}

/** Satu tahap alur tim: 1 simpul, atau beberapa yang jalan paralel (rel bercabang). */
export type RailStage = RailNode[];

/** Ruas kustom: menimpa ruas otomatis (tahap ke tahap berikutnya) bila tim punya alur lain. */
export interface RailEdge { from: string; to: string }

export interface RailMapProps {
  stages: RailStage[];
  edges?: RailEdge[];
  /** Belum ada run: semua simpul diam dan satu ajakan Mulai run. */
  empty?: boolean;
  onStart?: () => void;
  /** Jumlah tahap per baris sebelum rel berbalik; bawaan 6. */
  perRow?: number;
  ariaLabel?: string;
}

const GAP = 104, X0 = 56, R = 24, LANE2 = 56, LANE3 = 104, LBL_BELOW = 84, LBL_ABOVE = 52, GUTTER = 72, PAD = 16;

interface Placed { node: RailNode; x: number; y: number; above: boolean; row: number; stage: number }

function layout(stages: RailStage[], perRow: number) {
  const rows: RailStage[][] = [];
  stages.forEach((s, i) => { (rows[Math.floor(i / perRow)] ??= []).push(s); });
  const placed: Placed[] = [];
  const ymids: number[] = [];
  let top = PAD;
  rows.forEach((row, r) => {
    const maxN = Math.max(...row.map((s) => s.length));
    const lane = maxN === 2 ? LANE2 : LANE3;
    const span = (maxN - 1) * lane;
    const above = maxN === 2;
    const cy = top + (above ? LBL_ABOVE : 0) + span / 2;
    row.forEach((stage, c) => {
      stage.forEach((node, k) => {
        const y = stage.length === 1 ? cy : cy - ((stage.length - 1) * lane) / 2 + k * lane;
        placed.push({ node, x: X0 + c * GAP, y, above: above && stage.length === 2 && k === 0, row: r, stage: r * perRow + c });
      });
    });
    const bottom = cy + span / 2 + LBL_BELOW;
    ymids.push(bottom + GUTTER / 2);
    top = bottom + GUTTER + R;
  });
  const cols = Math.min(perRow, stages.length);
  const width = X0 * 2 + (Math.max(cols, 1) - 1) * GAP + 80;
  const height = top - R - GUTTER + PAD;
  return { placed, ymids, width, height, rows: rows.length };
}

function pathFor(a: Placed, b: Placed, ymid: number, width: number): string {
  const x1 = a.x + 10, x2 = b.x - 10;
  if (b.row === a.row) {
    if (a.y === b.y) return `M${x1} ${a.y} H${x2}`;
    const m = (x1 + x2) / 2;
    return `M${x1} ${a.y} C${m} ${a.y} ${m} ${b.y} ${x2} ${b.y}`;
  }
  const xr = width - 24, xl = 24;
  return `M${x1} ${a.y} H${xr - R} A${R} ${R} 0 0 1 ${xr} ${a.y + R} V${ymid - R} A${R} ${R} 0 0 1 ${xr - R} ${ymid} H${xl + R} A${R} ${R} 0 0 0 ${xl} ${ymid + R} V${b.y - R} A${R} ${R} 0 0 0 ${xl + R} ${b.y} H${x2}`;
}

type SegState = 'done' | 'live' | 'todo';
function segState(to: AgentStatus): SegState {
  return to === 'run' || to === 'ask' ? 'live' : to === 'done' || to === 'bad' ? 'done' : 'todo';
}

export interface TrackSegmentsProps { segments: { key: string; d: string; to: AgentStatus }[] }

/** Ruas rel: Selesai tinta tipis, Jalan biru tebal (+ kereta bila Jalan), sisanya abu. */
export function TrackSegments({ segments }: TrackSegmentsProps) {
  return (
    <g className="rail-tracks">
      {segments.map((s) => (
        <g key={s.key}>
          <path className={`trk ${segState(s.to)}`} d={s.d} />
          {s.to === 'run' && (
            <circle className="rtrain" r={3}>
              <animateMotion dur="1.6s" repeatCount="indefinite" path={s.d} />
            </circle>
          )}
        </g>
      ))}
    </g>
  );
}

function summary(stages: RailStage[]) {
  const n: Partial<Record<AgentStatus, number>> = {};
  stages.flat().forEach((x) => { n[x.status] = (n[x.status] ?? 0) + 1; });
  return (['done', 'ask', 'bad', 'run', 'ready', 'skipped'] as AgentStatus[])
    .filter((s) => n[s]).map((s) => `${n[s]} ${STATUS_TEXT[s].toLowerCase()}`).join(', ');
}

/** Peta jalur: alur tim dari kiri ke kanan, rel berbalik tiap `perRow` tahap. Tanpa data: bentuk dari props. */
export function RailMap({ stages, edges, empty = false, onStart, perRow = 6, ariaLabel }: RailMapProps) {
  const shown: RailStage[] = empty ? stages.map((s) => s.map((n) => ({ ...n, status: 'ready' as const, statusText: undefined, tool: undefined }))) : stages;
  const { placed, ymids, width, height } = layout(shown, perRow);
  const byId = new Map(placed.map((p) => [p.node.id, p]));
  const pairs: [Placed, Placed][] = [];
  if (edges) {
    edges.forEach((e) => { const a = byId.get(e.from), b = byId.get(e.to); if (a && b) pairs.push([a, b]); });
  } else {
    for (let i = 0; i + 1 < shown.length; i++) {
      const A = placed.filter((p) => p.stage === i), B = placed.filter((p) => p.stage === i + 1);
      if (A.length === 1 || B.length === 1) A.forEach((a) => B.forEach((b) => pairs.push([a, b])));
      else A.forEach((a, k) => { const b = B[Math.min(k, B.length - 1)]; if (b) pairs.push([a, b]); });
    }
  }
  const segments = pairs.map(([a, b]) => ({ key: `${a.node.id}>${b.node.id}`, d: pathFor(a, b, ymids[a.row] ?? 0, width), to: b.node.status }));
  const label = ariaLabel ?? (empty ? 'Alur tim, belum ada run: semua agent siap.' : `Alur tim: ${summary(shown)}.`);
  return (
    <div className={`railmap${empty ? ' railmap--empty' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <TrackSegments segments={segments} />
        {placed.map((p) => (
          <Station key={p.node.id} x={p.x} y={p.y} status={p.node.status} name={p.node.name}
            statusText={p.node.statusText} tool={p.node.tool} labelAbove={p.above} />
        ))}
      </svg>
      {empty && (
        <div className="railmap__start">
          <p>Belum ada run di proyek ini. Tim siap jalan begitu kamu mulai.</p>
          <button className="btn btn--primary" type="button" onClick={onStart}>Mulai run</button>
        </div>
      )}
    </div>
  );
}
