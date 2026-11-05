import { z } from 'zod';
import { Run } from './runs.js';
import { RunStatus, Tokens } from './common.js';
import { TeamAgent } from './teams.js';
import { Evidence } from './evidence.js';

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
      from: z.enum(['dashboard', 'desktop', 'agent', 'system']), // desktop = dijawab di terminal Claude Code; agent = dibatalkan claude (mis. dijawab di tempat lain); system = run berakhir
      answers: z.record(z.string(), z.string()).nullable(), // question -> jawaban (multi-pilih digabung ", ")
      decision: z.enum(['allow', 'deny', 'always']).nullable(), // always = izinkan + aturan proyek disimpan (F5)
      reason: z.string().nullable(),
    })
    .nullable(),
  answeredAt: z.string().nullable(),
  sentOnResume: z.boolean(), // owner: dikirim saat Lanjut ("terkirim saat lanjut")
  // system "Aturan disimpan": ruleId untuk Batalkan (DELETE /api/projects/:id/rules/:ruleId).
  ref: z.object({ itemId: z.string().optional(), milestoneId: z.string().optional(), batchId: z.string().optional(), ruleId: z.string().optional() }).strict().nullable().optional(),
});
export type Message = z.infer<typeof Message>;

export const ToolEvent = z.object({
  name: z.string(),
  summary: z.string(),
  subagent: z.boolean(),
  at: z.string(),
  // Fase 1: langkah alat lengkap, tidak dipangkas (PRD A15).
  id: z.string().optional(),
  input: z.unknown().optional(),
  result: z.unknown().optional(),
  status: z.enum(['running', 'done', 'failed']).optional(),
  // Fase 1 (6.3): pemilik langkah (id agent atau `orkestrator`) dan id tool_use claude. Langkah dikirim dua kali:
  // saat mulai (running, input) dan saat hasil (done/failed, result); pembaca menggabungkan per toolUseId.
  agent: z.string().optional(),
  toolUseId: z.string().optional(),
});
export type ToolEvent = z.infer<typeof ToolEvent>;

// Baris agent_activity (ARCHITECTURE 5): satu panggilan subagent; id = tool_use_id pemanggil (Agent/Task).
export const AgentActivity = z.object({
  id: z.string(), runId: z.string(), sessionId: z.string(), agent: z.string(), inTeam: z.boolean(), itemKey: z.string().nullable(),
  round: z.number().int(), status: z.enum(['running', 'done', 'failed']), startedAt: z.string(), endedAt: z.string().nullable(),
  modelUsed: z.string().nullable(), toolCount: z.number().int(), files: z.array(z.string()), tokens: Tokens,
}).strict();
export type AgentActivity = z.infer<typeof AgentActivity>;

// Batch dan Milestone (ARCHITECTURE 5): event SSE `batch` dan `milestone`, dan bagian RunDetail.
export const Batch = z.object({
  id: z.string(), runId: z.string(), milestoneId: z.string().nullable(), number: z.number().int(), sessionId: z.string().nullable(),
  itemKeys: z.array(z.string()), commitHash: z.string().nullable(), commitError: z.string().nullable(),
  startedAt: z.string(), endedAt: z.string().nullable(), tokens: Tokens,
}).strict();
export type Batch = z.infer<typeof Batch>;
export const Milestone = z.object({
  id: z.string(), projectId: z.string(), backlogKey: z.string(), name: z.string(), kind: z.string(),
  status: z.enum(['proposed', 'approved', 'running', 'ready_review', 'accepted']), reviewRound: z.number().int(),
  runId: z.string().nullable(), initialItemCount: z.number().int(), proposedAt: z.string().nullable(), approvedAt: z.string().nullable(),
  runningAt: z.string().nullable(), readyReviewAt: z.string().nullable(), acceptedAt: z.string().nullable(),
}).strict();
export type Milestone = z.infer<typeof Milestone>;

// Setiap perubahan status run (dari, ke, alasan, waktu): sumber riwayat dan pemberitahuan. from null = run baru.
export const RunStatusChange = z.object({ from: RunStatus.nullable(), to: RunStatus, reason: z.string().nullable(), at: z.string() }).strict();
export type RunStatusChange = z.infer<typeof RunStatusChange>;

export const RunEvent = z.discriminatedUnion('type', [
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('run'), data: Run }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('message'), data: Message }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('tool'), data: ToolEvent }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('status'), data: RunStatusChange }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('activity'), data: AgentActivity }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('batch'), data: Batch }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('milestone'), data: Milestone }),
]);
export type RunEvent = z.infer<typeof RunEvent>;

export const AnswerRequest = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('question'),
    // kunci = teks pertanyaan persis; nilai = satu jawaban, atau beberapa untuk multi-pilih. Jawaban bebas boleh.
    answers: z.record(z.string().max(2000), z.union([z.string().trim().min(1).max(2000), z.array(z.string().trim().min(1).max(2000)).min(1).max(20)])),
  }).strict(),
  z.object({
    kind: z.literal('permission'),
    decision: z.enum(['allow', 'deny', 'always']), // always: 400 rule_not_allowed untuk kategori berisiko
    reason: z.string().trim().max(1000).optional(), // alasan penolakan, diteruskan ke agent
  }).strict(),
]);
export type AnswerRequest = z.infer<typeof AnswerRequest>;

// ---- Fase 1 (ARCHITECTURE 6.2/6.3) ----
export const MessageKindV2 = z.enum(['agent', 'question', 'permission', 'owner', 'system', 'milestone', 'decision']);
export const MessageV2 = Message.omit({ kind: true }).extend({
  kind: MessageKindV2,
  source: z.enum(['session', 'backlog', 'desktop', 'system']),
  ref: z.object({
    itemId: z.string().optional(), milestoneId: z.string().optional(), batchId: z.string().optional(), ruleId: z.string().optional(),
  }).strict().nullable(),
  proposal: z.object({ milestoneId: z.string(), name: z.string(), items: z.array(z.object({ id: z.string(), title: z.string() }).strict()) }).strict().nullable(),
});
export type MessageV2 = z.infer<typeof MessageV2>;

export const AnswerRequestV2 = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('question'),
    answers: z.record(z.string().max(2000), z.union([z.string().trim().min(1).max(2000), z.array(z.string().trim().min(1).max(2000)).min(1).max(20)])),
  }).strict(),
  z.object({ kind: z.literal('permission'), decision: z.enum(['allow', 'deny', 'always']), reason: z.string().trim().max(1000).optional() }).strict(),
  z.object({ kind: z.literal('milestone'), decision: z.literal('approve') }).strict(),
  z.object({ kind: z.literal('decision'), answer: z.string().trim().min(1).max(2000) }).strict(),
]);
export type AnswerRequestV2 = z.infer<typeof AnswerRequestV2>;

export const OwnerMessageRequest= z.object({ text: z.string().trim().min(1).max(8000) }).strict();

export const RunDetail = z.object({
  run: Run, messages: z.array(Message), batches: z.array(Batch), milestone: Milestone.nullable(), activities: z.array(AgentActivity), isLatest: z.boolean(),
});

// GET /api/runs/:id/agents/:agent (6.2). definition null = agent di luar tim; modelUsed null = belum jalan.
export const AgentDetail = z.object({
  definition: TeamAgent.nullable(), inTeam: z.boolean(), modelDeclared: z.string().nullable(), modelUsed: z.string().nullable(),
  rounds: z.array(AgentActivity), steps: z.array(ToolEvent).max(200), files: z.array(z.string()), tokens: Tokens, durationMs: z.number(),
  evidence: z.array(Evidence),
}).strict();
export type AgentDetail = z.infer<typeof AgentDetail>;
