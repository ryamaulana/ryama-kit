import { useEffect, useMemo, useState } from 'react';
import {
  Background, BaseEdge, getBezierPath, Handle, Panel, Position, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge, type EdgeProps, type Node, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import type { AgentRow } from '../../ui/project/AgentColumn.js';
import { Station } from '../../ui/project/Station.js';
import { TrackSegments } from '../../ui/project/RailMap.js';
import type { AgentStatus } from '../../ui/parts/StatusDot.js';
import { NODE_H, NODE_W, railLayout } from '../lib/railLayout.js';
import { MAP_VIEW_KEY, parseMapView, type MapView } from '../lib/mapView.js';
import './FlowMap.css';

// Lebar tata letak tetap: peta tidak bergeser saat kolom Chat/Detail berubah; pas layar diurus kanvas.
const LAYOUT_W = 1000;

type StationData = { row: AgentRow; selected: boolean; onSelect: (id: string) => void } & Record<string, unknown>;

function StationNode({ data }: NodeProps<Node<StationData>>) {
  const { row, selected, onSelect } = data;
  return (
    <button type="button" className={`flowmap__node nodrag${selected ? ' flowmap__node--sel' : ''}`} style={{ width: NODE_W, height: NODE_H }}
      aria-label={`${row.name}, ${row.statusText ?? row.status}. Buka detail`} aria-pressed={selected} onClick={() => onSelect(row.id)}>
      <svg width={NODE_W} height={NODE_H} aria-hidden="true">
        <Station x={NODE_W / 2} y={12} status={row.status} name={row.name} statusText={row.statusText} />
      </svg>
      <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, top: 12 }} />
      <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0, top: 12 }} />
    </button>
  );
}

function TrackEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<Edge<{ to: AgentStatus }>>) {
  const [d] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return <TrackSegments segments={[{ key: id, d, to: data?.to ?? 'ready' }]} />;
}
const NODE_TYPES = { station: StationNode };
const EDGE_TYPES = { track: TrackEdge };

function Toolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="top-right" className="flowmap__tools">
      <button type="button" className="btn" onClick={() => zoomIn()}>Perbesar</button>
      <button type="button" className="btn" onClick={() => zoomOut()}>Perkecil</button>
      <button type="button" className="btn" onClick={() => fitView({ padding: 0.1 })}>Pas layar</button>
    </Panel>
  );
}

export interface FlowMapProps {
  flow: { nodes: string[]; edges: [string, string][] };
  rows: AgentRow[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

function Graph({ flow, rows, selectedId, onSelect }: FlowMapProps) {
  const { nodes, edges } = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const lay = railLayout(flow, LAYOUT_W);
    const ns: Node<StationData>[] = lay.nodes.flatMap((n) => {
      const row = byId.get(n.id);
      return row ? [{ id: n.id, type: 'station', position: { x: n.x, y: n.y }, width: n.w, height: n.h, draggable: false, data: { row, selected: n.id === selectedId, onSelect } }] : [];
    });
    const es: Edge[] = flow.edges.map(([a, b]) => ({ id: `${a}>${b}`, source: a, target: b, type: 'track', selectable: false, focusable: false, data: { to: byId.get(b)?.status ?? 'ready' } }));
    return { nodes: ns, edges: es };
  }, [flow, rows, selectedId, onSelect]);
  const key = flow.nodes.join('|');
  const rf = useReactFlow();
  useEffect(() => { void rf.fitView({ padding: 0.1 }); }, [key, rf]); // hanya saat susunan tim berganti, bukan tiap status
  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={NODE_TYPES} edgeTypes={EDGE_TYPES} fitView fitViewOptions={{ padding: 0.1 }}
      nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} minZoom={0.2} maxZoom={2} proOptions={{ hideAttribution: true }}
      aria-label="Alur tim: geser untuk memindahkan, gulir atau tombol untuk zoom">
      <Background gap={24} />
      <Toolbar />
    </ReactFlow>
  );
}

/** Peta jalur: kanvas @xyflow/react (zoom, geser, pas layar) dengan stasiun dan ruas dari ui/. Pilihan Grafik/Timeline diingat per perangkat. */
export function FlowMap(props: FlowMapProps) {
  const [view, setView] = useState<MapView>(() => parseMapView(localStorage.getItem(MAP_VIEW_KEY)));
  const pick = (v: MapView) => { setView(v); localStorage.setItem(MAP_VIEW_KEY, v); };
  return (
    <div className="flowmap">
      <div className="flowmap__views" role="group" aria-label="Tampilan peta">
        <button type="button" className="btn" aria-pressed={view === 'graph'} onClick={() => pick('graph')}>Grafik</button>
        <button type="button" className="btn" aria-pressed={view === 'timeline'} onClick={() => pick('timeline')}>Timeline</button>
      </div>
      {view === 'graph'
        ? <div style={{ height: 'calc(100% - 48px)', minHeight: 320 }}><ReactFlowProvider><Graph {...props} /></ReactFlowProvider></div>
        : <p className="flowmap__soon" role="status">Timeline belum tersedia. Pilih Grafik untuk melihat alur tim.</p>}
    </div>
  );
}
