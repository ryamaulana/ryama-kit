// Kontrak bersama: tipe dasar. Perubahan kontrak dilakukan di folder ini dulu, lalu bagian kontrak di docs diperbarui.
import { z } from 'zod';

// limit_paused dan ready_review disiapkan untuk iterasi batch/milestone; belum dipakai server.
export const RunStatus = z.enum([
  'running', 'needs_owner', 'paused', 'limit_paused', 'ready_review',
  'stopped', 'failed', 'done', 'disconnected',
]);
export type RunStatus = z.infer<typeof RunStatus>;
export const TERMINAL_STATUSES: RunStatus[] = ['stopped', 'failed', 'done', 'disconnected'];

// ---- Permintaan ----
// Daftar model yang bisa dipilih (alias resmi `claude --model`; alias selalu menunjuk versi terbaru).
export const MODELS = [
  { id: 'opus', label: 'Opus', description: 'Paling mampu, paling boros kuota' },
  { id: 'sonnet', label: 'Sonnet', description: 'Seimbang untuk kerja harian' },
  { id: 'haiku', label: 'Haiku', description: 'Tercepat dan paling hemat' },
] as const;
export const ModelId = z.enum(['opus', 'sonnet', 'haiku']);
export type ModelId = z.infer<typeof ModelId>;

export const EmptyBody = z.object({}).strict();

export const STATUS_LABEL: Record<RunStatus, string> = {
  running: 'Berjalan', needs_owner: 'Butuh kamu', paused: 'Jeda', limit_paused: 'Jeda limit',
  ready_review: 'Siap ditinjau', stopped: 'Dihentikan', failed: 'Gagal', done: 'Selesai', disconnected: 'Terputus',
};

export const Tokens = z.object({ input: z.number(), output: z.number(), cacheRead: z.number(), cacheWrite: z.number() }).strict();
export type Tokens = z.infer<typeof Tokens>;
// Total token = input + output + cache tulis (cache baca tidak dihitung).
export const countTokens = (t: { input: number; output: number; cacheWrite: number }): number => t.input + t.output + t.cacheWrite;
