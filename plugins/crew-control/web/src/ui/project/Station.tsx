import type { AgentStatus } from '../parts/StatusDot.js';
import { STATUS_TEXT } from '../parts/StatusDot.js';

export interface StationProps {
  /** Pusat stasiun di koordinat SVG peta. */
  x: number;
  y: number;
  status: AgentStatus;
  name: string;
  /** Kata status di bawah nama; bawaan dari status. Mis. "Jalan · putaran 3". */
  statusText?: string;
  /** Satu baris langkah alat (mono) untuk agent Jalan. */
  tool?: string;
  /** Label di atas stasiun (untuk rel paralel bagian atas). */
  labelAbove?: boolean;
}

/** Satu stasiun di peta: lingkaran 16 + label nama + kata status (+ langkah alat). Dipakai di dalam <svg> peta. */
export function Station({ x, y, status, name, statusText, tool, labelAbove = false }: StationProps) {
  const text = statusText ?? STATUS_TEXT[status];
  const nameY = labelAbove ? y - 50 : y + 32;
  const statusY = nameY + 16;
  const toolY = statusY + 16;
  const subClass = status === 'ask' ? 'sub ask' : status === 'run' ? 'sub run' : status === 'bad' ? 'sub bad' : 'sub';
  return (
    <g className={`stn stn--${status}`}>
      <circle className={`stn-${status}`} cx={x} cy={y} r={8} />
      {status === 'done' && <path className="chk" transform={`translate(${x} ${y})`} d="M-3.5 .2l2.4 2.4 4.6-4.8" />}
      {status === 'ask' && <text className="q" x={x} y={y + 4}>?</text>}
      {status === 'bad' && <path className="chk chk--bad" transform={`translate(${x} ${y})`} d="M-3 -3l6 6M3 -3l-6 6" />}
      {status === 'skipped' && <path className="chk chk--dim" transform={`translate(${x} ${y})`} d="M-3 0h6" />}
      <text className="lbl" x={x} y={nameY}>{name}</text>
      <text className={subClass} x={x} y={statusY}>
        {text.split(' · ').map((part, i) => (i === 0 ? part : <tspan key={i}><tspan dx={2}>·</tspan><tspan dx={6}>{part}</tspan></tspan>))}
      </text>
      {tool && <text className="tool" x={x} y={toolY} {...({ translate: 'no' } as object)}>{tool}</text>}
    </g>
  );
}
