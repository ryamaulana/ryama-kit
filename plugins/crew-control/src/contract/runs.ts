import { z } from 'zod';
import { RunStatus, ModelId } from './common.js';
import { TeamSummary } from './teams.js';

export const Run = z.object({
  id: z.string(),
  project: z.string(), // path nyata folder proyek
  projectName: z.string(),
  prompt: z.string(),
  model: z.string().nullable(),
  origin: z.literal('dashboard'),
  status: RunStatus,
  reason: z.string().nullable(), // alasan gagal/berhenti, teks biasa
  lastLog: z.string().nullable(), // ekor stderr claude saat gagal, teks biasa
  sessionId: z.string().nullable(),
  pending: z.number().int(), // jumlah pertanyaan/izin yang menunggu pemilik
  tokens: z.object({ input: z.number(), output: z.number(), cacheRead: z.number(), cacheWrite: z.number() }).nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
});
export type Run = z.infer<typeof Run>;

export const StartRunRequest = z.object({
  project: z.string().min(1).max(500), // path absolut: folder kerja atau folder di bawahnya (kedalaman bebas)
  prompt: z.string().trim().min(1).max(20000),
  model: ModelId.optional(), // kosong = model bawaan server (Config.defaultModel)
}).strict();
export type StartRunRequest = z.infer<typeof StartRunRequest>;

// ---- Fase 1 (ARCHITECTURE 6.2/6.3). Berdampingan dengan skema irisan sampai server dimigrasi (item lain). ----
export const RunV2 = Run.omit({ origin: true }).extend({
  projectId: z.string(),
  teamId: z.string().nullable(),
  commandId: z.string().nullable(),
  title: z.string(),
  origin: z.enum(['dashboard', 'desktop']),
  batchSize: z.number().int(),
  milestone: z.object({ id: z.string(), name: z.string(), done: z.number().int(), total: z.number().int() }).strict().nullable(),
  batchNo: z.number().int().nullable(),
  limitResetAt: z.string().nullable(),
}).strict();
export type RunV2 = z.infer<typeof RunV2>;

export const StartRunRequestV2 = z.object({
  project: z.string().min(1).max(500),
  teamId: z.string().min(1).max(64),
  commandId: z.string().min(1).max(64),
  prompt: z.string().trim().max(20000), // wajib bila perintah needsText: dicek server terhadap definisi tim
  model: ModelId.optional(),
}).strict();
export type StartRunRequestV2 = z.infer<typeof StartRunRequestV2>;

export const RunListQuery = z.object({
  project: z.string().max(500).optional(), status: RunStatus.optional(), team: z.string().max(64).optional(),
  q: z.string().max(200).optional(), origin: z.enum(['dashboard', 'desktop']).optional(),
  cursor: z.string().max(200).optional(), limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();
export const RunListV2 = z.object({ runs: z.array(RunV2), nextCursor: z.string().nullable() }).strict();

export const RunList = z.object({ runs: z.array(Run) });
export const FolderListing = z.object({
  path: z.string(), // path nyata folder ini
  name: z.string(),
  parent: z.string().nullable(), // null bila ini folder kerja (tidak bisa naik lebih tinggi)
  isRoot: z.boolean(),
  folders: z.array(z.object({ name: z.string(), path: z.string(), activeRunId: z.string().nullable() })), // subfolder langsung, urut nama, maks 500
  project: z.object({
    id: z.string(), lastCommandId: z.string().nullable(), hasOpenBacklog: z.boolean(), activeRunId: z.string().nullable(),
  }).strict().nullable(), // null bila folder ini belum pernah punya run dan tanpa backlog terbuka
});
export const Config = z.object({
  workRoot: z.string(),
  projects: z.array(z.object({ name: z.string(), path: z.string() })), // subfolder langsung folder kerja (pintasan; jelajah lewat /api/folders)
  models: z.array(z.object({ id: ModelId, label: z.string(), description: z.string() })),
  defaultModel: ModelId,
  maxRuns: z.number().int(),
  permissionMode: z.literal('A3'),
  defaultBatchSize: z.number().int().min(1).max(20),
  teams: z.array(TeamSummary),
});
