import { STATUS_TEXT, StatusDot, type AgentStatus } from '../parts/StatusDot.js';
import { withSeps } from '../parts/Sep.js';
import { Icon } from '../parts/icons.js';
import type { ReactNode } from 'react';

export interface AgentRow {
  id: string;
  name: string;
  status: AgentStatus;
  /** Kata status lengkap, mis. "Jalan · putaran 3"; bawaan dari status. */
  statusText?: string;
  /** Item yang dikerjakan; hanya ditampilkan untuk Jalan dan Butuh kamu. */
  item?: string;
}

export interface AgentColumnProps {
  agents: AgentRow[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Tim, mode, orkestrator di dasar kolom. */
  teamNote?: ReactNode;
  heading?: string;
}

const FOLDED: AgentStatus[] = ['done', 'ready', 'skipped'];
const FOLD_WORD: Partial<Record<AgentStatus, string>> = { done: 'selesai', ready: 'siap', skipped: 'dilewati' };

function Row({ a, selected, onSelect }: { a: AgentRow; selected: boolean; onSelect?: (id: string) => void }) {
  const text = a.statusText ?? STATUS_TEXT[a.status];
  const showItem = a.item && (a.status === 'run' || a.status === 'ask');
  return (
    <li>
      <button
        type="button"
        className={`agent agent--${a.status}`}
        aria-pressed={selected}
        aria-label={`${a.name}, ${text}`}
        onClick={() => onSelect?.(a.id)}
      >
        <StatusDot status={a.status} hideLabel />
        <span className="agent__name">
          <span className="agent__full">{a.name}</span>
          <span className="agent__init" aria-hidden="true">{a.name.slice(0, 2)}</span>
          <span className="agent__st">{withSeps(text)}</span>
        </span>
        {showItem && <span className="agent__item">{a.item}</span>}
      </button>
    </li>
  );
}

/** Kolom kiri layar proyek: bulatan status + nama + kata status; Jalan dan Butuh kamu menambah item; sisanya dilipat. */
export function AgentColumn({ agents, selectedId = null, onSelect, teamNote, heading = 'Agent' }: AgentColumnProps) {
  const active = agents.filter((a) => !FOLDED.includes(a.status));
  const folded = agents.filter((a) => FOLDED.includes(a.status));
  const foldLabel = (['done', 'ready', 'skipped'] as AgentStatus[])
    .map((s) => [folded.filter((a) => a.status === s).length, FOLD_WORD[s]] as const)
    .filter(([n]) => n > 0)
    .map(([n, w]) => `${n} ${w}`)
    .join(' · ');
  return (
    <aside className="agents" aria-labelledby="agents-h">
      <div className="agents__head">
        <h2 id="agents-h">{heading}</h2>
        <span>{agents.length} di tim</span>
      </div>
      <ul className="agent-list">
        {active.map((a) => <Row key={a.id} a={a} selected={selectedId === a.id} onSelect={onSelect} />)}
      </ul>
      {folded.length > 0 && (
        <details className="agents__fold">
          <summary>
            <Icon.chevronRight />
            <span>{withSeps(foldLabel)}</span>
          </summary>
          <ul className="agent-list">
            {folded.map((a) => <Row key={a.id} a={a} selected={selectedId === a.id} onSelect={onSelect} />)}
          </ul>
        </details>
      )}
      {teamNote && <p className="agents__team">{teamNote}</p>}
    </aside>
  );
}
