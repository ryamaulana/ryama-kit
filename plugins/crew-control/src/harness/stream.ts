import { z } from 'zod';

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
