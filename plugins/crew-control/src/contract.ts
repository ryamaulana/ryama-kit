// Kontrak bersama server dan tampilan (sumber kebenaran bentuk data).
// Perubahan kontrak dilakukan di sini dulu, lalu bagian "Kontrak API" di docs/KEPUTUSAN.md diperbarui.
import { z } from 'zod';

// limit_paused dan ready_review disiapkan untuk iterasi batch/milestone; belum dipakai server.
export const RunStatus = z.enum([
  'running', 'needs_owner', 'paused', 'limit_paused', 'ready_review',
  'stopped', 'failed', 'done', 'disconnected',
]);
export type RunStatus = z.infer<typeof RunStatus>;
export const TERMINAL_STATUSES: RunStatus[] = ['stopped', 'failed', 'done', 'disconnected'];

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

export const Question = z.object({
  question: z.string(),
  header: z.string().nullable(),
  multiSelect: z.boolean(),
  options: z.array(z.object({ label: z.string(), description: z.string().nullable() })),
});
export type Question = z.infer<typeof Question>;

export const MessageKind = z.enum(['agent', 'question', 'permission', 'owner', 'system']);

// SEMUA `text`, `question`, `label`, `description`, `tool.summary` adalah teks biasa dari agent:
// tampilan wajib merender sebagai teks (textContent), bukan HTML/markdown mentah.
export const Message = z.object({
  id: z.string(),
  runId: z.string(),
  kind: MessageKind,
  text: z.string(),
  createdAt: z.string(),
  // question / permission: pending -> answered | cancelled. owner: queued (saat Jeda) -> sent. lainnya: null.
  state: z.enum(['pending', 'answered', 'cancelled', 'queued', 'sent']).nullable(),
  questions: z.array(Question).nullable(), // hanya kind=question
  tool: z.object({ name: z.string(), summary: z.string(), why: z.string() }).nullable(), // hanya kind=permission
  answer: z
    .object({
      from: z.enum(['dashboard', 'agent', 'system']), // agent = dibatalkan claude (mis. dijawab di tempat lain); system = run berakhir
      answers: z.record(z.string(), z.string()).nullable(), // question -> jawaban (multi-pilih digabung ", ")
      decision: z.enum(['allow', 'deny']).nullable(),
      reason: z.string().nullable(),
    })
    .nullable(),
  answeredAt: z.string().nullable(),
  sentOnResume: z.boolean(), // owner: dikirim saat Lanjut ("terkirim saat lanjut")
});
export type Message = z.infer<typeof Message>;

export const ToolEvent = z.object({
  name: z.string(),
  summary: z.string(),
  subagent: z.boolean(),
  at: z.string(),
});
export type ToolEvent = z.infer<typeof ToolEvent>;

export const RunEvent = z.discriminatedUnion('type', [
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('run'), data: Run }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('message'), data: Message }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('tool'), data: ToolEvent }),
]);
export type RunEvent = z.infer<typeof RunEvent>;

// ---- Permintaan ----
// Daftar model yang bisa dipilih (alias resmi `claude --model`; alias selalu menunjuk versi terbaru).
export const MODELS = [
  { id: 'opus', label: 'Opus', description: 'Paling mampu, paling boros kuota' },
  { id: 'sonnet', label: 'Sonnet', description: 'Seimbang untuk kerja harian' },
  { id: 'haiku', label: 'Haiku', description: 'Tercepat dan paling hemat' },
] as const;
export const ModelId = z.enum(['opus', 'sonnet', 'haiku']);
export type ModelId = z.infer<typeof ModelId>;

export const StartRunRequest = z.object({
  project: z.string().min(1).max(500), // path absolut: folder kerja atau folder di bawahnya (kedalaman bebas)
  prompt: z.string().trim().min(1).max(20000),
  model: ModelId.optional(), // kosong = model bawaan server (Config.defaultModel)
}).strict();
export type StartRunRequest = z.infer<typeof StartRunRequest>;

export const AnswerRequest = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('question'),
    // kunci = teks pertanyaan persis; nilai = satu jawaban, atau beberapa untuk multi-pilih. Jawaban bebas boleh.
    answers: z.record(z.string().max(2000), z.union([z.string().trim().min(1).max(2000), z.array(z.string().trim().min(1).max(2000)).min(1).max(20)])),
  }).strict(),
  z.object({
    kind: z.literal('permission'),
    decision: z.enum(['allow', 'deny']),
    reason: z.string().trim().max(1000).optional(), // alasan penolakan, diteruskan ke agent
  }).strict(),
]);
export type AnswerRequest = z.infer<typeof AnswerRequest>;

export const OwnerMessageRequest = z.object({ text: z.string().trim().min(1).max(8000) }).strict();
export const EmptyBody = z.object({}).strict();

// ---- Respons ----
export const RunDetail = z.object({ run: Run, messages: z.array(Message) });
export const RunList = z.object({ runs: z.array(Run) });
export const FolderListing = z.object({
  path: z.string(), // path nyata folder ini
  name: z.string(),
  parent: z.string().nullable(), // null bila ini folder kerja (tidak bisa naik lebih tinggi)
  isRoot: z.boolean(),
  folders: z.array(z.object({ name: z.string(), path: z.string() })), // subfolder langsung, urut nama, maks 500
});
export const Config = z.object({
  workRoot: z.string(),
  projects: z.array(z.object({ name: z.string(), path: z.string() })), // subfolder langsung folder kerja (pintasan; jelajah lewat /api/folders)
  models: z.array(z.object({ id: ModelId, label: z.string(), description: z.string() })),
  defaultModel: ModelId,
  maxRuns: z.number().int(),
  permissionMode: z.literal('A3'),
});
export const ApiError = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional() }),
});
export type ApiError = z.infer<typeof ApiError>;
