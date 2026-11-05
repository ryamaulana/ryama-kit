import { z } from 'zod';
import type { ToolEvent } from '../contract/index.js';
import type { ActivityRow } from '../store/types.js';

export const QuestionsInput = z.object({
  questions: z.array(z.object({
    question: z.string(),
    header: z.string().optional(),
    multiSelect: z.boolean().optional(),
    options: z.array(z.object({ label: z.string(), description: z.string().optional() })).optional(),
  })).min(1),
});

export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '...' : s);
export const nowIso = () => new Date().toISOString();

export function summarize(input: unknown): string {
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const v = i.command ?? i.file_path ?? i.notebook_path ?? i.pattern ?? i.path ?? i.description ?? i.prompt ?? i.url;
  return clip(typeof v === 'string' ? v : JSON.stringify(input ?? {}), 300);
}

// ---- Status agent live (F4, SPIKE T1) ----
// Satu aktivitas = satu panggilan subagent, dikunci per tool_use_id pemanggil (Agent, dulu Task).
// Sumber status, urut kekuatan: task_notification/task_updated; cadangan: tool_result Agent/Task yang bukan "Async agent launched".
const SPAWN = new Set(['Agent', 'Task']);
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const ORCH = 'orkestrator';
const doneOf = (s: unknown): ActivityRow['status'] | null =>
  s === 'completed' ? 'done' : typeof s === 'string' && ['failed', 'killed', 'stopped', 'error', 'cancelled'].includes(s) ? 'failed' : null;

export interface ActivityTracker {
  /** Satu pesan stream-json -> aktivitas yang berubah + langkah alat baru (input/hasil utuh, tanpa pemangkasan). */
  feed(m: any): { activities: ActivityRow[]; tools: ToolEvent[] };
  /** Proses berakhir: aktivitas yang masih jalan ditandai gagal. */
  end(): ActivityRow[];
}

export function createActivityTracker(o: { runId: string; sessionId: string; teamAgents: string[] | null; prior?: ActivityRow[] }): ActivityTracker {
  const acts = new Map<string, ActivityRow>();
  const seenMsg = new Map<string, Set<string>>(); // aktivitas -> message.id yang tokennya sudah dihitung
  const rounds = new Map<string, number>();
  for (const a of o.prior ?? []) rounds.set(a.agent, Math.max(rounds.get(a.agent) ?? 0, a.round));
  const taskToUse = new Map<string, string>();
  const steps = new Map<string, { name: string; agent: string; sub: boolean; input: unknown }>();

  const start = (id: string, subagentType: unknown, prompt: unknown, changed: Set<ActivityRow>) => {
    if (acts.has(id)) return;
    const agent = String(subagentType ?? 'general-purpose').split(':').pop()!; // "fullstack-dev:be" -> "be"
    const round = (rounds.get(agent) ?? 0) + 1;
    rounds.set(agent, round);
    const item = typeof prompt === 'string' ? /^\s*ITEM\s+(\S+)/.exec(prompt)?.[1] ?? null : null;
    const a: ActivityRow = {
      id, runId: o.runId, sessionId: o.sessionId, agent, inTeam: o.teamAgents?.includes(agent) ?? false, itemKey: item, round,
      status: 'running', startedAt: nowIso(), endedAt: null, modelUsed: null, toolCount: 0, files: [], tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    };
    acts.set(id, a);
    changed.add(a);
  };
  const finish = (id: string | undefined, status: ActivityRow['status'] | null, changed: Set<ActivityRow>) => {
    const a = id ? acts.get(id) : undefined;
    if (!a || !status || a.status !== 'running') return;
    a.status = status;
    a.endedAt = nowIso();
    changed.add(a);
  };

  return {
    feed(m) {
      const changed = new Set<ActivityRow>();
      const tools: ToolEvent[] = [];
      const parent: string | null = m?.parent_tool_use_id ?? null;
      const owner = parent ? acts.get(parent) : undefined;
      const agent = parent ? owner?.agent ?? 'subagent' : ORCH;
      const content = Array.isArray(m?.message?.content) ? m.message.content : [];
      if (m?.type === 'assistant') {
        if (owner) {
          if (m.message.model) owner.modelUsed = String(m.message.model);
          const seen = seenMsg.get(owner.id) ?? new Set<string>();
          seenMsg.set(owner.id, seen);
          const u = m.message.usage;
          if (u && !seen.has(m.message.id)) { // pesan yang dipecah per blok membawa usage yang sama
            seen.add(m.message.id);
            owner.tokens = {
              input: owner.tokens.input + (u.input_tokens ?? 0), output: owner.tokens.output + (u.output_tokens ?? 0),
              cacheRead: owner.tokens.cacheRead + (u.cache_read_input_tokens ?? 0), cacheWrite: owner.tokens.cacheWrite + (u.cache_creation_input_tokens ?? 0),
            };
            changed.add(owner);
          }
        }
        for (const c of content) {
          if (c?.type !== 'tool_use') continue;
          const name = String(c.name);
          steps.set(c.id, { name, agent, sub: !!parent, input: c.input });
          tools.push({ name, summary: summarize(c.input), subagent: !!parent, at: nowIso(), agent, toolUseId: c.id, input: c.input, status: 'running' });
          if (owner) {
            owner.toolCount++;
            const f = c.input?.file_path ?? c.input?.notebook_path;
            if (FILE_TOOLS.has(name) && typeof f === 'string' && !owner.files.includes(f)) owner.files.push(f);
            changed.add(owner);
          }
          if (SPAWN.has(name)) start(c.id, c.input?.subagent_type, c.input?.prompt, changed);
        }
      } else if (m?.type === 'user') {
        for (const c of content) {
          if (c?.type !== 'tool_result') continue;
          const s = steps.get(c.tool_use_id);
          const failed = c.is_error === true;
          tools.push({
            name: s?.name ?? 'unknown', summary: summarize(s?.input), subagent: s?.sub ?? !!parent, at: nowIso(), agent: s?.agent ?? agent,
            toolUseId: c.tool_use_id, input: s?.input, result: c.content, status: failed ? 'failed' : 'done',
          });
          if (s && SPAWN.has(s.name)) {
            const text = typeof c.content === 'string' ? c.content : JSON.stringify(c.content ?? '');
            if (failed) finish(c.tool_use_id, 'failed', changed);
            else if (!text.includes('Async agent launched')) finish(c.tool_use_id, 'done', changed); // subagent latar: belum selesai
          }
        }
      } else if (m?.type === 'system') {
        const id: string | undefined = m.tool_use_id ?? taskToUse.get(m.task_id);
        if (m.subtype === 'task_started' && m.tool_use_id) {
          if (m.task_id) taskToUse.set(m.task_id, m.tool_use_id);
          start(m.tool_use_id, m.subagent_type, m.prompt, changed);
        } else if (m.subtype === 'task_progress' && id && acts.has(id)) {
          const a = acts.get(id)!;
          const n = Number(m.usage?.tool_uses ?? 0);
          if (n > a.toolCount) { a.toolCount = n; changed.add(a); } // cadangan bila langkah subagent tidak terlihat
        } else if (m.subtype === 'task_notification') finish(id, doneOf(m.status), changed);
        else if (m.subtype === 'task_updated') finish(id, doneOf(m.patch?.status), changed);
      }
      return { activities: [...changed].map((a) => ({ ...a, files: [...a.files] })), tools };
    },
    end() {
      const changed = new Set<ActivityRow>();
      for (const a of acts.values()) finish(a.id, 'failed', changed);
      return [...changed].map((a) => ({ ...a, files: [...a.files] }));
    },
  };
}
