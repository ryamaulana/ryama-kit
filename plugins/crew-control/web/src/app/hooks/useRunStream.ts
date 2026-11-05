import { useEffect, useReducer, useRef, useState } from 'react';
import { applyEvent, emptyState, type RunEventInput, type RunState } from '../lib/runState.js';
import { backoffMs } from '../lib/projectScreen.js';

export type StreamStatus = 'connecting' | 'live' | 'reconnecting';
const TYPES = ['run', 'message', 'tool', 'activity'] as const;

/**
 * Ikuti SSE satu run (ARCHITECTURE 6.3). Server memutar ulang dari awal, jadi tanpa seed.
 * EventSource menyambung ulang sendiri (membawa Last-Event-ID); bila ditutup browser, buka lagi dengan ?after=<id terakhir>.
 */
export function useRunStream(runId: string | null): { state: RunState; status: StreamStatus } {
  const [state, dispatch] = useReducer((s: RunState, a: RunEventInput | 'reset') => (a === 'reset' ? emptyState() : applyEvent(s, a)), undefined, emptyState);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const lastId = useRef('');

  useEffect(() => {
    dispatch('reset');
    setStatus('connecting');
    if (!runId) return;
    lastId.current = '';
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let closed = false;
    const open = () => {
      es = new EventSource(`/api/runs/${encodeURIComponent(runId)}/events${lastId.current ? `?after=${lastId.current}` : ''}`);
      es.onopen = () => { attempt = 0; setStatus('live'); };
      for (const type of TYPES) {
        es.addEventListener(type, (e) => {
          const m = e as MessageEvent<string>;
          if (m.lastEventId) lastId.current = m.lastEventId;
          try { dispatch({ type, data: JSON.parse(m.data) } as RunEventInput); } catch { /* event rusak: lewati */ }
        });
      }
      es.onerror = () => {
        setStatus('reconnecting');
        if (es?.readyState === EventSource.CLOSED && !closed) {
          es.close();
          timer = setTimeout(open, backoffMs(attempt++));
        }
      };
    };
    open();
    return () => { closed = true; clearTimeout(timer); es?.close(); };
  }, [runId]);

  return { state, status };
}
