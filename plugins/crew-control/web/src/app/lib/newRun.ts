// Logika murni Run baru (UX.md 5a): bawaan dari localStorage, draf, permintaan, galat.
export const PREFS_KEY = 'crew.newrun';
export const DRAFT_KEY = 'crew.draft';
export const MAX_PROMPT = 20000;
export const NEEDS_TEXT_MSG = 'Tulis dulu apa yang mau dikerjakan.';
export const FOLDER_RESET_MSG = 'Folder terakhir sudah tidak ada. Dipakai folder kerja.';

export interface Prefs { folder?: string; model?: string; team?: string; recent: string[]; cmds: Record<string, string> }
export interface CmdInfo { id: string; kind: 'session' | 'backlog' }

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 500;

/** Nilai rusak diabaikan per bidang, tidak membatalkan seluruhnya. */
export function parsePrefs(raw: string | null | undefined): Prefs {
  let o: Record<string, unknown> = {};
  try { const v = JSON.parse(raw ?? ''); if (v && typeof v === 'object') o = v as Record<string, unknown>; } catch { /* kosong */ }
  const cmds: Record<string, string> = {};
  if (o.cmds && typeof o.cmds === 'object') for (const [k, v] of Object.entries(o.cmds)) if (isStr(v)) cmds[k] = v;
  return {
    folder: isStr(o.folder) ? o.folder : undefined,
    model: isStr(o.model) ? o.model : undefined,
    team: isStr(o.team) ? o.team : undefined,
    recent: Array.isArray(o.recent) ? o.recent.filter(isStr).slice(0, 5) : [],
    cmds,
  };
}

/** Setelah run dimulai: ingat pilihan; folder terbaru di depan, tanpa duplikat, maks 5. */
export function rememberRun(p: Prefs, r: { folder: string; model: string; team: string; commandId: string }): Prefs {
  return {
    folder: r.folder, model: r.model, team: r.team,
    recent: [r.folder, ...p.recent.filter((f) => f !== r.folder)].slice(0, 5),
    cmds: { ...p.cmds, [r.folder]: r.commandId },
  };
}

/** Pilihan tersimpan hanya dipakai bila masih ada di server; selain itu bawaan server / yang pertama. */
export function pickId(saved: string | undefined, ids: string[], fallback?: string): string {
  if (saved && ids.includes(saved)) return saved;
  return fallback && ids.includes(fallback) ? fallback : (ids[0] ?? '');
}

/** Perintah: terakhir di folder itu; lalu "Lanjut backlog" bila backlog terbuka; lalu yang pertama bukan backlog. */
export function pickCommand(cmds: CmdInfo[], last: string | null | undefined, hasOpenBacklog: boolean): string {
  if (last && cmds.some((c) => c.id === last)) return last;
  const want = hasOpenBacklog ? cmds.find((c) => c.kind === 'backlog') : undefined;
  return (want ?? cmds.find((c) => c.kind !== 'backlog') ?? cmds[0])?.id ?? '';
}

export function parseDraft(raw: string | null | undefined): string {
  return typeof raw === 'string' ? raw.slice(0, MAX_PROMPT) : '';
}

/** null = boleh kirim; selain itu pesan untuk notice needs-text. */
export function validatePrompt(text: string, needsText: boolean): string | null {
  return needsText && !text.trim() ? NEEDS_TEXT_MSG : null;
}

type StartErr = { status: number; code: string; message: string; details?: Record<string, unknown> };
export interface StartNotice {
  kind: 'busy' | 'capacity' | 'failed';
  message: string;
  action?: { label: string; href: string };
  /** 400 folder hilang: tempelkan di tombol folder dan buka popover. */
  folderGone?: boolean;
}

/** Galat POST /api/runs -> isi notice (UX.md 5a, "Saat Mulai"). Teks pemilik tidak disentuh. */
export function startNotice(e: StartErr, ctx: { activeRunId?: string | null }): StartNotice {
  if (e.code === 'project_busy') {
    const id = (e.details?.activeRunId as string | undefined) ?? ctx.activeRunId ?? undefined;
    return { kind: 'busy', message: 'Proyek ini sudah punya run aktif.', action: id ? { label: 'Buka run', href: `/proyek/${id}` } : undefined };
  }
  if (e.code === 'capacity') {
    const n = Array.isArray(e.details?.activeRunIds) ? e.details.activeRunIds.length : undefined;
    return { kind: 'capacity', message: `Sudah ${n ?? 'beberapa'} run jalan bersamaan. Hentikan satu atau tunggu.`, action: { label: 'Lihat proyek', href: '/' } };
  }
  if (e.code === 'project_not_found' || e.code === 'invalid_project') return { kind: 'failed', message: e.message, folderGone: true };
  return { kind: 'failed', message: e.message };
}
