import type { AgentDetail } from '../../../../src/contract/messages.js';
import { countTokens, formatDuration, formatTokens } from './format.js';

/** Respons GET /api/runs/:id/agents/:agent -> data tab Detail. Agent belum jalan (modelUsed null, tanpa langkah) = definisi saja. */
// Tanpa impor ui/ (tsx) agar tes node jalan; bentuk hasil = AgentDetailData, dicek saat dipakai di ProjectContainer.
export function toDetailData<S extends string>(row: { name: string; status: S; statusText?: string; item?: string }, d: AgentDetail) {
  const ran = d.modelUsed !== null || d.steps.length > 0;
  return {
    name: row.name, role: d.definition?.role ?? 'Agent di luar tim ini.',
    status: row.status, statusText: row.statusText,
    task: row.item, modelDeclared: d.modelDeclared ?? 'tidak dideklarasikan', modelUsed: d.modelUsed ?? undefined,
    skills: d.definition?.skills ?? [], tools: d.definition?.tools ?? [], mcp: [],
    steps: d.steps.map((s) => ({ tool: s.name, summary: s.summary, time: s.at.slice(11, 19) })),
    files: d.files.map((path) => ({ path, change: 'ubah' as const })), // shortcut: kontrak hanya memberi path, jenis perubahan belum ada
    tokens: ran ? formatTokens(countTokens(d.tokens)) : undefined,
    duration: ran ? formatDuration(d.durationMs) : undefined,
    evidence: d.evidence.map((e) => ({ label: e.caption, note: e.present ? e.path : 'file bukti hilang' })),
  };
}
