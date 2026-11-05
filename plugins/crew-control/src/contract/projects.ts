import { z } from 'zod';
import { RunStatus, Tokens } from './common.js';

export const BatchSize = z.number().int().min(1).max(20);
export const MilestoneProgress = z.object({ name: z.string(), done: z.number().int(), total: z.number().int(), batch: z.string().nullable() }).strict();

export const ProjectSummary = z.object({
  id: z.string(), name: z.string(), relPath: z.string(), path: z.string(), origin: z.enum(['dashboard', 'desktop']),
  status: RunStatus.nullable(), pending: z.number().int(), oldestPendingAt: z.string().nullable(),
  milestone: MilestoneProgress.nullable(), activeAgents: z.array(z.string()), tokens: Tokens.nullable(),
  durationMs: z.number().nullable(), lastActivityAt: z.string().nullable(), latestRunId: z.string().nullable(),
  limitResetAt: z.string().nullable(), reason: z.string().nullable(),
}).strict();
export type ProjectSummary = z.infer<typeof ProjectSummary>;

export const ProjectBoard = z.object({
  totals: z.object({
    needsOwner: z.number().int(), readyReview: z.number().int(), active: z.number().int(), maxRuns: z.number().int(),
    failed: z.number().int(), limitPaused: z.number().int(), earliestReset: z.string().nullable(),
  }).strict(),
  projects: z.array(ProjectSummary),
}).strict();

export const Project = ProjectSummary.extend({
  batchSize: BatchSize, teamId: z.string().nullable(),
  rules: z.array(z.object({ id: z.string(), tool: z.string(), pattern: z.string(), createdAt: z.string() }).strict()),
  readyMilestoneId: z.string().nullable(),
}).strict();
export type Project = z.infer<typeof Project>;

export const ProjectSettingsRequest = z.object({ batchSize: BatchSize.optional(), teamId: z.string().min(1).max(64).optional() }).strict();
export const SettingsRequest = z.object({ batchSize: BatchSize }).strict();
export const SettingsResponse = SettingsRequest;
export const ProjectsQuery = z.object({ recent: z.coerce.number().int().min(1).max(100).optional() }).strict();
