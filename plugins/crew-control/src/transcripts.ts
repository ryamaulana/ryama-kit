// Transcripts: token, model, dan atribusi ITEM per pemanggilan agent dari transkrip Claude Code (JSONL).
// Port ringkas dari flow-viewer/server/tokens.js. Tata letak: <root>/<proyek>/<sesi>.jsonl dan
// <root>/<proyek>/<sesi>/subagents/agent-<agentId>.jsonl.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Tokens } from './contract/index.js';
import type { Store, SessionRow } from './store/index.js';
import { isInside } from './projects.js';

export interface AgentUsage { id: string; agent: string; itemKey: string | null; startedAt: string; endedAt: string | null; modelUsed: string | null; toolCount: number; tokens: Tokens }
/** tokens = sesi utama + semua agent (yang dipakai pemilik); agents = rincian per pemanggilan. */
export interface SessionUsage { sessionId: string; tokens: Tokens; models: string[]; modelUsed: string | null; agents: AgentUsage[] }

export const defaultRoot = () => path.join(os.homedir(), '.claude', 'projects');
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/;
const zero = (): Tokens => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
export const itemOf = (s: unknown): string | null => /\bITEM\s+([a-z0-9][a-z0-9-]*)/.exec(String(s ?? ''))?.[1] ?? null;

interface Turn { u: Record<string, unknown>; model: string; t: string }
interface FileState {
  offset: number; turns: Map<string, Turn>; tools: number; first: string; firstPrompt: string; last: string;
  calls: Map<string, { agent: string; item: string | null; startedAt: string }>; agentIds: Map<string, string>; // agentId -> tool_use id
}
const cache = new Map<string, FileState>();
const fresh = (): FileState => ({ offset: 0, turns: new Map(), tools: 0, first: '', firstPrompt: '', last: '', calls: new Map(), agentIds: new Map() });

function feed(st: FileState, o: any): void {
  const t: string = typeof o.timestamp === 'string' ? o.timestamp : '';
  if (t) { st.first ||= t; st.last = t; }
  const m = o.message;
  if (!m || typeof m !== 'object') return;
  if (o.type === 'user') {
    if (!st.firstPrompt && typeof m.content === 'string') st.firstPrompt = m.content;
    if (Array.isArray(m.content)) for (const b of m.content) {
      if (b?.type !== 'tool_result') continue;
      const txt = JSON.stringify(b.content ?? '');
      const id = /agentId:\s*([A-Za-z0-9]+)/.exec(txt)?.[1];
      if (id) st.agentIds.set(id, b.tool_use_id);
    }
    return;
  }
  if (o.type !== 'assistant') return;
  if (Array.isArray(m.content)) for (const b of m.content) {
    if (b?.type !== 'tool_use') continue;
    st.tools++;
    if (b.name === 'Agent' || b.name === 'Task') {
      const p = b.input?.prompt;
      st.calls.set(b.id, { agent: String(b.input?.subagent_type ?? 'agent').split(':').pop()!.trim() || 'agent', item: itemOf(p), startedAt: t });
    }
  }
  if (!m.usage || m.model === '<synthetic>') return;
  const id = m.id || o.uuid;
  if (!id) return;
  st.turns.set(id, { u: m.usage, model: String(m.model ?? ''), t: st.turns.get(id)?.t ?? t }); // streaming: id sama, yang terakhir menang
}

/** Baca hanya byte baru sejak pembacaan terakhir; baris terakhir yang belum lengkap ditunda. */
function load(file: string): FileState | null {
  let size: number;
  try { size = fs.statSync(file).size; } catch { return null; }
  let st = cache.get(file);
  if (!st || size < st.offset) { st = fresh(); cache.set(file, st); }
  if (size > st.offset) {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(size - st.offset);
      fs.readSync(fd, buf, 0, buf.length, st.offset);
      const cut = buf.lastIndexOf(10) + 1;
      for (const line of buf.subarray(0, cut).toString('utf8').split('\n')) {
        if (!line) continue;
        try { feed(st, JSON.parse(line)); } catch { /* baris rusak dilewati */ }
      }
      st.offset += cut;
    } finally { fs.closeSync(fd); }
  }
  return st;
}

function sum(st: FileState): { tokens: Tokens; byModel: Map<string, number> } {
  const tokens = zero(), byModel = new Map<string, number>();
  for (const { u, model } of st.turns.values()) {
    const i = num(u.input_tokens), o = num(u.output_tokens), r = num(u.cache_read_input_tokens), w = num(u.cache_creation_input_tokens);
    tokens.input += i; tokens.output += o; tokens.cacheRead += r; tokens.cacheWrite += w;
    const md = model.replace(/^claude-/, '');
    if (md) byModel.set(md, (byModel.get(md) ?? 0) + i + o + w);
  }
  return { tokens, byModel };
}

/** Path transkrip harus di dalam root (symlink diselesaikan); selain itu null. */
function safe(root: string, file: string): string | null {
  try {
    const r = fs.realpathSync(root), f = fs.realpathSync(file);
    return isInside(r, f) && f.endsWith('.jsonl') ? f : null;
  } catch { return null; }
}

function findMain(root: string, sessionId: string): string | null {
  try {
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
      const f = path.join(root, d.name, `${sessionId}.jsonl`);
      if (d.isDirectory() && fs.existsSync(f)) return f;
    }
  } catch { /* root tidak ada */ }
  return null;
}

/** null bila transkrip tidak ada atau path di luar root (pemanggil jangan menimpa data tersimpan). */
export function usage(sessionId: string, transcriptPath?: string, root = defaultRoot()): SessionUsage | null {
  if (!SESSION_ID.test(sessionId)) return null;
  const given = transcriptPath ?? findMain(root, sessionId);
  const file = given && safe(root, given);
  if (!file) return null;
  const main = load(file);
  if (!main) return null;
  const total = sum(main);
  const byModel = new Map(total.byModel);
  const tokens = { ...total.tokens };
  const agents: AgentUsage[] = [];
  const dir = path.join(path.dirname(file), path.basename(file, '.jsonl'), 'subagents');
  let names: string[] = [];
  try { names = fs.readdirSync(dir).filter((n) => /^agent-[A-Za-z0-9]+\.jsonl$/.test(n)).sort(); } catch { /* tanpa subagent */ }
  for (const n of names) {
    const sf = safe(root, path.join(dir, n));
    const st = sf && load(sf);
    if (!st) continue;
    const agentId = n.slice(6, -6), callId = main.agentIds.get(agentId);
    const call = callId ? main.calls.get(callId) : undefined;
    const s = sum(st);
    const top = [...s.byModel].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    for (const [k, v] of s.byModel) byModel.set(k, (byModel.get(k) ?? 0) + v);
    for (const k of Object.keys(tokens) as (keyof Tokens)[]) tokens[k] += s.tokens[k];
    agents.push({
      id: callId ?? `agent-${agentId}`, agent: call?.agent ?? 'agent', itemKey: call?.item ?? itemOf(st.firstPrompt),
      startedAt: call?.startedAt || st.first, endedAt: st.last || null, modelUsed: top, toolCount: st.tools, tokens: s.tokens,
    });
  }
  agents.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const ranked = [...byModel].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  return { sessionId, tokens, models: ranked, modelUsed: ranked[0] ?? null, agents };
}

/**
 * Hook satu titik: panggil saat sesi berakhir. Menyimpan token+model sesi dan tiap pemanggilan agent ke Store,
 * supaya angka tetap ada bila berkas transkrip hilang. Tanpa transkrip atau baris sesi: tidak mengubah apa pun.
 */
export function recordSessionUsage(store: Store, sessionId: string, transcriptPath?: string, root = defaultRoot()): SessionUsage | null {
  const row: SessionRow | undefined = store.getSession(sessionId);
  const u = row && usage(sessionId, transcriptPath, root);
  if (!row || !u) return null;
  store.saveSession({ ...row, tokens: u.tokens, modelUsed: u.modelUsed });
  const round = new Map<string, number>();
  for (const a of u.agents) {
    const r = (round.get(a.agent) ?? 0) + 1;
    round.set(a.agent, r);
    store.saveActivity({ id: a.id, runId: row.runId, sessionId, agent: a.agent, inTeam: true, itemKey: a.itemKey, round: r, status: 'done', startedAt: a.startedAt, endedAt: a.endedAt, modelUsed: a.modelUsed, toolCount: a.toolCount, files: [], tokens: a.tokens });
  }
  return u;
}
