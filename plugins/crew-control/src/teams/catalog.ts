// TeamCatalog: tiap subfolder dari CREW_TEAM_DIRS = satu plugin tim. Dipindai tiap panggilan, jadi agent baru langsung muncul.
// [Fase 1] A14: tanpa crew/team.json, plugin bernama "fullstack-dev" memakai fullstack.fallback.json (data, bukan kode); plugin lain tanpa team.json dilewati.
import fs from 'node:fs';
import path from 'node:path';
import { Team, TeamManifest, type TeamSummary } from '../contract/index.js';
import { AgentMdError, parseAgentMd, type AgentDef } from './agent-md.js';

const FALLBACK = path.join(import.meta.dirname, 'fullstack.fallback.json');
const FALLBACK_PLUGIN = 'fullstack-dev';

export interface TeamCatalog { list(): TeamSummary[]; get(id: string): Team | null; agentOf(team: Team, name: string): Team['agents'][number] | undefined }

const bad = (id: string, name: string, file: string, section: string, message: string): Team => ({
  id, name, valid: false, error: { file, section, message }, commands: [], agents: [],
  orchestrator: { id: '', label: '' }, flow: { nodes: [], edges: [] }, milestoneKinds: [],
});

function load(pluginDir: string): Team | null {
  const dirName = path.basename(pluginDir);
  const manifestFile = path.join(pluginDir, 'crew', 'team.json');
  let file = manifestFile;
  if (!fs.existsSync(manifestFile)) {
    if (dirName !== FALLBACK_PLUGIN || !fs.existsSync(path.join(pluginDir, 'agents'))) return null;
    file = FALLBACK;
  }
  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return bad(dirName, dirName, file, 'json', 'Bukan JSON yang valid.'); }
  const parsed = TeamManifest.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0]!;
    const r = raw as { id?: unknown; name?: unknown };
    return bad(typeof r?.id === 'string' ? r.id : dirName, typeof r?.name === 'string' ? r.name : dirName, file, i.path.join('.') || 'team', i.message);
  }
  const m = parsed.data;
  const agents = new Map<string, AgentDef>();
  for (const d of m.agentDirs) {
    const dir = path.resolve(pluginDir, d);
    if (!fs.existsSync(dir)) return bad(m.id, m.name, file, 'agentDirs', `Folder agent tidak ada: ${d}`);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
      const p = path.join(dir, f);
      try { const a = parseAgentMd(fs.readFileSync(p, 'utf8')); agents.set(a.id, a); } catch (e) {
        if (e instanceof AgentMdError) return bad(m.id, m.name, p, e.section, e.message);
        throw e;
      }
    }
  }
  const missing = m.flow.nodes.find((n) => !agents.has(n));
  if (missing) return bad(m.id, m.name, file, 'flow.nodes', `Agent "${missing}" ada di alur tetapi tidak ada di folder agent.`);
  return {
    id: m.id, name: m.name, valid: true,
    commands: m.commands.map(({ id, label, kind, needsText, placeholder }) => ({ id, label, kind, needsText, placeholder })),
    agents: [...agents.values()], orchestrator: m.orchestrator, flow: m.flow, milestoneKinds: m.milestoneKinds,
  };
}

export function createCatalog(dirs: string[]): TeamCatalog {
  const all = (): Team[] => {
    const seen = new Set<string>();
    const out: Team[] = [];
    for (const root of dirs) {
      if (!fs.existsSync(root)) continue;
      for (const e of fs.readdirSync(root, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const t = load(path.join(root, e.name));
        if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
      }
    }
    return out;
  };
  return {
    list: () => all().map(({ id, name, valid, error, commands }) => ({ id, name, valid, ...(error ? { error } : {}), commands })),
    get: (id) => all().find((t) => t.id === id) ?? null,
    agentOf: (team, name) => team.agents.find((a) => a.id === name),
  };
}
