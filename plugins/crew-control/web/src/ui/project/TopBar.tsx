import { useEffect, useRef, type ReactNode } from 'react';
import { Pips } from '../parts/Pips.js';
import { withSeps } from '../parts/Sep.js';
import { StatusDot, type AgentStatus } from '../parts/StatusDot.js';

export type RunPhase = 'run' | 'paused' | 'stopped' | 'ask';

export interface TopBarProps {
  name: string;
  /** Path relatif ke folder kerja, mis. "clients › toconnect". */
  path?: string;
  /** Penanda data contoh (disembunyikan untuk data asli). */
  sampleLabel?: string;
  phase: RunPhase;
  /** Kata status; bawaan menurut phase. */
  statusText?: string;
  /** Milestone: nama, item selesai, total, dikerjakan, batch. Kosong = prompt bebas (teks `freeText`). */
  milestone?: { name: string; done: number; total: number; now?: number; bad?: number; batch?: string };
  freeText?: string;
  tokens?: string;
  duration?: string;
  waiting?: number;
  onJumpWaiting?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  /** Konfirmasi Stop menempel di tombol: terbuka bila stopOpen. */
  stopOpen?: boolean;
  onStopRequest?: () => void;
  onStopConfirm?: () => void;
  onStopCancel?: () => void;
  /** Tombol bar kanan tambahan (mis. Run baru pada run dihentikan). */
  children?: ReactNode;
}

const PHASE_TEXT: Record<RunPhase, string> = { run: 'Jalan', paused: 'Dijeda', stopped: 'Dihentikan', ask: 'Butuh kamu' };
const PHASE_DOT: Record<RunPhase, AgentStatus | 'paused' | 'stopped'> = { run: 'run', paused: 'paused', stopped: 'stopped', ask: 'ask' };

function PhaseDot({ phase }: { phase: RunPhase }) {
  const k = PHASE_DOT[phase];
  if (k === 'paused') return <span className="phase-dot phase-dot--paused" aria-hidden="true" />;
  if (k === 'stopped') return <span className="phase-dot phase-dot--stopped" aria-hidden="true" />;
  return <StatusDot status={k} hideLabel />;
}

/** Bar atas layar proyek (56): nama + path, status, deret item, token, durasi, menunggu, Jeda/Lanjut dan Stop. */
export function TopBar(p: TopBarProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (p.stopOpen) popRef.current?.querySelector<HTMLButtonElement>('button:last-of-type')?.focus();
    else if (wasOpen.current) stopRef.current?.focus();
    wasOpen.current = !!p.stopOpen;
  }, [p.stopOpen]);

  const m = p.milestone;
  const stopped = p.phase === 'stopped';
  const progressText = m
    ? `${m.name} · ${m.done}/${m.total} item${m.batch ? ` · ${m.batch}` : ''}`
    : p.freeText;
  return (
    <header className={`topbar topbar--${p.phase}`}>
      <div className="topbar__title">
        <h1>{p.name}</h1>
        {p.path && <span className="topbar__path">{p.path}</span>}
        {p.sampleLabel && <span className="topbar__sample">{p.sampleLabel}</span>}
      </div>
      <span className="topbar__status">
        <PhaseDot phase={p.phase} />
        <span>{p.statusText ?? PHASE_TEXT[p.phase]}</span>
      </span>
      {(m || p.freeText) && (
        <div className="topbar__progress">
          {m && <Pips total={m.total} done={m.done} now={m.now} bad={m.bad} />}
          <span className="topbar__progress-text"><b>{progressText && withSeps(progressText)}</b></span>
        </div>
      )}
      {(p.tokens || p.duration) && (
        <div className="topbar__meta">
          {p.tokens && <span>{p.tokens}</span>}
          {p.duration && <span>{p.duration}</span>}
        </div>
      )}
      {!!p.waiting && (
        <button type="button" className="topbar__waiting" onClick={p.onJumpWaiting}>
          <span className="topbar__ring" aria-hidden="true" />
          {p.waiting} menunggu kamu
        </button>
      )}
      <div className="topbar__controls">
        {p.children}
        {!stopped && (
          <>
            <button type="button" className="btn" onClick={p.phase === 'paused' ? p.onResume : p.onPause}>
              {p.phase === 'paused' ? 'Lanjut' : 'Jeda'}
            </button>
            <button
              ref={stopRef}
              type="button"
              className="btn"
              aria-expanded={!!p.stopOpen}
              aria-controls="stop-pop"
              onClick={p.stopOpen ? p.onStopCancel : p.onStopRequest}
            >
              Stop
            </button>
            {p.stopOpen && (
              <div
                ref={popRef}
                id="stop-pop"
                className="topbar__pop"
                role="dialog"
                aria-labelledby="stop-q"
                onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); p.onStopCancel?.(); } }}
              >
                <p><b id="stop-q">Hentikan run?</b>Pekerjaan yang belum di-commit tetap di folder.</p>
                <div className="topbar__pop-row">
                  <button type="button" className="btn btn--primary" onClick={p.onStopConfirm}>Hentikan</button>
                  <button type="button" className="btn" onClick={p.onStopCancel}>Batal</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
