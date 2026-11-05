// Port web/lib.js: state run dari event SSE. Murni, tanpa DOM.
import { TERMINAL_STATUSES, STATUS_LABEL, type RunStatus } from '../../../../src/contract/common.js';
import type { Message, ToolEvent } from '../../../../src/contract/messages.js';
import type { Run } from '../../../../src/contract/runs.js';
import type { AgentActivity } from './types.js';

export { STATUS_LABEL };
export type RunState = { run: Run | null; messages: Message[]; tools: ToolEvent[]; activities: AgentActivity[] };
export type RunEventInput =
  | { type: 'run'; data: Run } | { type: 'message'; data: Message }
  | { type: 'tool'; data: ToolEvent } | { type: 'activity'; data: AgentActivity };

export const emptyState = (): RunState => ({ run: null, messages: [], tools: [], activities: [] });

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

/** Terapkan satu event SSE. message dan activity diganti per id (event berupa pembaruan), tool ditambah. */
export function applyEvent(state: RunState, ev: RunEventInput): RunState {
  switch (ev.type) {
    case 'run': return { ...state, run: ev.data };
    case 'tool': return { ...state, tools: [...state.tools, ev.data] };
    case 'message': return { ...state, messages: upsert(state.messages, ev.data) };
    case 'activity': return { ...state, activities: upsert(state.activities, ev.data) };
    default: return state;
  }
}

/** Aksi yang boleh pada status ini. Run berakhir yang punya sesi tetap bisa dilanjutkan lewat pesan. */
export function allowedActions(status: RunStatus, sessionId: string | null = null) {
  if (TERMINAL_STATUSES.includes(status)) return { pause: false, resume: false, stop: false, message: !!sessionId };
  return { pause: status !== 'paused', resume: status === 'paused', stop: true, message: true };
}
