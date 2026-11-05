import { z } from 'zod';

const Id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const Text = (max: number) => z.string().min(1).max(max);
const PLACEHOLDERS = new Set(['prompt', 'batchSize', 'milestone', 'note', 'home']);
const onlyKnownPlaceholders = (s: string) => [...s.matchAll(/\{([^{}]*)\}/g)].every((m) => PLACEHOLDERS.has(m[1]!));

export const TeamCommand = z.object({
  id: Id,
  label: Text(100),
  kind: z.enum(['session', 'backlog']),
  template: Text(500).refine(onlyKnownPlaceholders, 'placeholder tidak dikenal'),
  needsText: z.boolean(),
  placeholder: Text(200),
}).strict();

export const TeamManifest = z.object({
  schema: z.literal(1),
  id: Id,
  name: Text(100),
  agentDirs: z.array(Text(300)).min(1).max(20),
  orchestrator: z.object({ id: Id, label: Text(100) }).strict(),
  flow: z.object({
    nodes: z.array(Id).min(1).max(100),
    edges: z.array(z.tuple([Id, Id])).max(500),
  }).strict(),
  commands: z.array(TeamCommand).min(1).max(20),
  backlog: z.object({ file: Text(300), cli: z.array(Text(300)).min(1).max(10) }).strict(),
  milestoneKinds: z.array(Text(50)).min(1).max(20),
  evidence: z.object({ contract: Text(300), dir: Text(300) }).strict(),
}).strict().refine(
  (t) => t.flow.edges.every(([a, b]) => t.flow.nodes.includes(a) && t.flow.nodes.includes(b)),
  { message: 'edge merujuk node yang tidak ada', path: ['flow', 'edges'] },
);
export type TeamManifest = z.infer<typeof TeamManifest>;

export const TeamSummary = z.object({
  id: z.string(),
  name: z.string(),
  valid: z.boolean(),
  error: z.object({ file: z.string(), section: z.string(), message: z.string() }).strict().optional(),
  commands: z.array(TeamCommand.pick({ id: true, label: true, kind: true, needsText: true, placeholder: true })),
}).strict();
export type TeamSummary = z.infer<typeof TeamSummary>;

export const TeamAgent = z.object({
  id: z.string(), name: z.string(), role: z.string(), model: z.string().nullable(),
  skills: z.array(z.string()), tools: z.array(z.string()),
}).strict();

export const Team = TeamSummary.extend({
  agents: z.array(TeamAgent),
  orchestrator: z.object({ id: z.string(), label: z.string() }).strict(),
  flow: z.object({ nodes: z.array(z.string()), edges: z.array(z.tuple([z.string(), z.string()])) }).strict(),
  milestoneKinds: z.array(z.string()),
}).strict();
export type Team = z.infer<typeof Team>;
