import { z } from 'zod';
import { Run } from './runs.js';
import { RunStatus } from './common.js';

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
  // Fase 1: langkah alat lengkap, tidak dipangkas (PRD A15).
  id: z.string().optional(),
  input: z.unknown().optional(),
  result: z.unknown().optional(),
  status: z.enum(['running', 'done', 'failed']).optional(),
});
export type ToolEvent = z.infer<typeof ToolEvent>;

// Setiap perubahan status run (dari, ke, alasan, waktu): sumber riwayat dan pemberitahuan. from null = run baru.
export const RunStatusChange = z.object({ from: RunStatus.nullable(), to: RunStatus, reason: z.string().nullable(), at: z.string() }).strict();
export type RunStatusChange = z.infer<typeof RunStatusChange>;

export const RunEvent = z.discriminatedUnion('type', [
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('run'), data: Run }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('message'), data: Message }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('tool'), data: ToolEvent }),
  z.object({ seq: z.number().int(), runId: z.string(), at: z.string(), type: z.literal('status'), data: RunStatusChange }),
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
    decision: z.enum(['allow', 'deny']),
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

export const RunDetail = z.object({ run: Run, messages: z.array(Message) });
