import { Mark, type MarkKind } from './Mark.js';

/** Enam status agent (UX.md 10): warna + bentuk/ikon + teks. */
export type AgentStatus = 'run' | 'ask' | 'done' | 'ready' | 'bad' | 'skipped';

export const STATUS_TEXT: Record<AgentStatus, string> = {
  run: 'Jalan', ask: 'Butuh kamu', done: 'Selesai', ready: 'Siap', bad: 'Gagal', skipped: 'Dilewati',
};
export const STATUS_MARK: Record<AgentStatus, MarkKind> = {
  run: 'run', ask: 'ask', done: 'done', ready: 'ready', bad: 'bad', skipped: 'skip',
};

export interface StatusDotProps {
  status: AgentStatus;
  /** Teks status; bawaan dari STATUS_TEXT (mis. "Jalan · putaran 3"). */
  label?: string;
  /** Hanya simbol (teks status ditulis di sebelahnya oleh pemanggil). */
  hideLabel?: boolean;
  /** 16 px (sama dengan stasiun peta) bukan 12 px. */
  large?: boolean;
}

/** Bulatan status: terisi (Jalan), cincin (Butuh kamu), centang (Selesai), garis (Siap, Dilewati), silang (Gagal). */
export function StatusDot({ status, label, hideLabel = false, large = false }: StatusDotProps) {
  const text = label ?? STATUS_TEXT[status];
  return (
    <span className={`status-dot status-dot--${status}`}>
      <Mark kind={STATUS_MARK[status]} small={!large} />
      {hideLabel ? null : <span className="status-dot__text">{text}</span>}
    </span>
  );
}
