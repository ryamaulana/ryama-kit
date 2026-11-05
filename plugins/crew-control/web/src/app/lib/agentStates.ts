import type { Message } from '../../../../src/contract/messages.js';
import type { Run } from '../../../../src/contract/runs.js';
import type { Team } from '../../../../src/contract/teams.js';
import type { AgentActivity } from './types.js';

export type AgentStatus = 'needs_owner' | 'failed' | 'running' | 'done' | 'idle' | 'skipped';
export const AGENT_STATUS_LABEL: Record<AgentStatus, string> =
  { needs_owner: 'Butuh kamu', failed: 'Gagal', running: 'Jalan', done: 'Selesai', idle: 'Siap', skipped: 'Dilewati' };
const RANK: Record<AgentStatus, number> = { needs_owner: 0, failed: 1, running: 2, done: 3, idle: 3, skipped: 3 };

export type AgentState = { id: string; name: string; status: AgentStatus; round: number; inTeam: boolean };
type PendingMsg = Pick<Message, 'kind' | 'state'> & { agent?: string | null };

/**
 * Status tiap agent + urutan kolom kiri: Butuh kamu, Gagal, Jalan, lalu sisanya menurut alur tim.
 * Pertanyaan/izin menunggu tanpa atribusi `agent` dianggap milik agent yang sedang jalan.
 * Agent di luar tim (in_team=false) ikut tampil setelah agent tim; `round` = putaran terbanyak agent itu.
 */
export function agentStates(team: Team, activities: AgentActivity[], messages: PendingMsg[], run: Pick<Run, 'status'> | null): AgentState[] {
  const pending = messages.filter((m) => (m.kind === 'question' || m.kind === 'permission') && m.state === 'pending');
  const latest = new Map<string, AgentActivity>();
  const rounds = new Map<string, number>();
  for (const a of activities) {
    const cur = latest.get(a.agent);
    if (!cur || a.round > cur.round || (a.round === cur.round && a.startedAt > cur.startedAt)) latest.set(a.agent, a);
    rounds.set(a.agent, Math.max(rounds.get(a.agent) ?? 0, a.round));
  }
  const attributed = new Set(pending.map((m) => m.agent).filter(Boolean) as string[]);
  const anyUnattributed = pending.some((m) => !m.agent);
  const finished = run?.status === 'done';

  const statusOf = (id: string): AgentStatus => {
    const a = latest.get(id);
    if (a?.status === 'running') return attributed.has(id) || anyUnattributed ? 'needs_owner' : 'running';
    if (a?.status === 'failed') return 'failed';
    if (a?.status === 'done') return 'done';
    return finished ? 'skipped' : 'idle';
  };

  const order = new Map<string, number>();
  [...team.flow.nodes, ...team.agents.map((a) => a.id)].forEach((id) => { if (!order.has(id)) order.set(id, order.size); });
  const rows: AgentState[] = team.agents.map((a) => ({ id: a.id, name: a.name, status: statusOf(a.id), round: rounds.get(a.id) ?? 0, inTeam: true }));
  const known = new Set(rows.map((r) => r.id));
  for (const a of activities) {
    if (known.has(a.agent)) continue;
    known.add(a.agent);
    rows.push({ id: a.agent, name: a.agent, status: statusOf(a.agent), round: rounds.get(a.agent) ?? 0, inTeam: false });
  }
  const ord = (r: AgentState) => order.get(r.id) ?? Number.MAX_SAFE_INTEGER;
  return rows.sort((x, y) => RANK[x.status] - RANK[y.status] || Number(y.inTeam) - Number(x.inTeam) || ord(x) - ord(y));
}
