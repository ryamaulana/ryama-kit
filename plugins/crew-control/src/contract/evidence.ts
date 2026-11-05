import { z } from 'zod';

// Path relatif di dalam proyek; tanpa absolut, tanpa "..", tanpa backslash (anti path traversal).
const RelPath = z.string().min(1).max(500).refine(
  (p) => !p.startsWith('/') && !/^[a-zA-Z]:/.test(p) && !p.includes('\\') && !p.split('/').includes('..') && !p.includes('\0'),
  'path harus relatif di dalam proyek',
);
export const EvidenceKind = z.enum(['image', 'mockup', 'mermaid', 'chart', 'tests', 'summary', 'video']);
export const EvidenceEntry = z.object({ kind: EvidenceKind, path: RelPath, caption: z.string().min(1).max(300) }).strict();
export const EvidenceManifest = z.object({ item: z.string().min(1).max(100), entries: z.array(EvidenceEntry).max(100) }).strict();
export type EvidenceManifest = z.infer<typeof EvidenceManifest>;

export const ChartFile = z.object({
  type: z.enum(['line', 'bar']),
  x: z.array(z.union([z.string(), z.number()])),
  series: z.array(z.object({ name: z.string(), values: z.array(z.number()) }).strict()),
  unit: z.string().optional(),
}).strict();
export const TestsFile = z.object({
  passed: z.number().int(), failed: z.number().int(), skipped: z.number().int().optional(),
  command: z.string(), files: z.array(z.string()),
}).strict();

// Bukti tersimpan (tabel evidence) untuk tampilan; path relatif proyek.
export const Evidence = z.object({
  id: z.string(), itemKey: z.string(), kind: EvidenceKind, path: RelPath, caption: z.string(), size: z.number().int(), present: z.boolean(),
}).strict();
export type Evidence = z.infer<typeof Evidence>;
