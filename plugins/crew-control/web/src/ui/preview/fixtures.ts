// Data contoh untuk pratinjau (PRD + mockup arah B, data-mockup.md bagian 4). Bukan data nyata kecuali 07_Sandbox.
import type { ProjectListViewProps, ProjectRow } from '../screens/ProjectListView.js';
import type { FolderItem } from '../screens/FolderPopover.js';

export const WORK_ROOT = 'D:\\01_Workspace';
const R = 'D:/01_Workspace';

export const attention: ProjectRow[] = [
  { id: 'toconnect', name: 'toconnect', path: 'clients › toconnect', href: '/proyek/toconnect', state: 'ask', stateLabel: 'Butuh kamu', pending: 1,
    detail: 'Pertanyaan dari ui-designer', milestone: { name: 'UI', done: 7, total: 24, now: 2, batch: 'batch 2' },
    runLine: 'fe, be jalan', runMeta: '412,6 rb token · 1 j 48 mnt', when: '10.42', action: { kind: 'answer', href: '/proyek/toconnect#chat' } },
  { id: 'ryama-kit', name: 'ryama-kit', path: 'ryama-kit', href: '/proyek/ryama-kit', state: 'review', stateLabel: 'Siap review',
    detail: 'Menunggu persetujuanmu', milestone: { name: 'Rilis 0.9', done: 12, total: 12 },
    runLine: 'Run selesai', runMeta: '238,1 rb token · 3 j 5 mnt', when: '09.57', action: { kind: 'review', href: '/proyek/ryama-kit/review' } },
  { id: 'absensi-cabang', name: 'absensi-cabang', path: 'clients › absensi-cabang', href: '/proyek/absensi-cabang', state: 'bad', stateLabel: 'Gagal',
    detail: 'Item 5 Rekap per cabang · putaran 3', milestone: { name: 'Inti', done: 4, total: 9, bad: 1 },
    runLine: 'Run berhenti', runMeta: '96,4 rb token · 41 mnt', when: '09.15', canResume: true,
    reason: 'Tes npm test -- rekap masih gagal setelah putaran 3: total jam cabang Bekasi selisih 1 hari.' },
];
export const running: ProjectRow[] = [
  { id: 'crew-control', name: 'crew-control', path: 'ryama-kit › plugins › crew-control', href: '/proyek/crew-control', state: 'run', stateLabel: 'Jalan',
    detail: 'be · Endpoint daftar proyek', milestone: { name: 'Server', done: 3, total: 10, now: 1, batch: 'batch 1' },
    runLine: 'be jalan', runMeta: '54,0 rb token · 22 mnt', when: '10.47' },
];
export const limited: ProjectRow[] = [
  { id: 'katalog-toko', name: 'katalog-toko', path: 'clients › katalog-toko', href: '/proyek/katalog-toko', state: 'limit', stateLabel: 'Jeda limit',
    detail: 'Lanjut sendiri pukul 17.00', milestone: { name: 'Katalog', done: 5, total: 8 },
    runLine: 'Run dijeda', runMeta: '181,7 rb token · 1 j 12 mnt', when: '10.05' },
];
export const quiet: ProjectRow[] = [
  { id: 'flow-viewer', name: 'flow-viewer', path: 'ryama-kit › plugins › flow-viewer', href: '/proyek/flow-viewer', state: 'done', stateLabel: 'Selesai', fromDesktop: true,
    milestoneText: 'Prompt bebas · 31 langkah', runMeta: '77,9 rb token · 26 mnt', when: 'Kemarin 16.20' },
  { id: '07_Sandbox', name: '07_Sandbox', path: '07_Sandbox', href: '/proyek/07_Sandbox', state: 'stopped', stateLabel: 'Dihentikan',
    milestoneText: 'Prompt bebas · 9 langkah', runMeta: '1,2 rb token · 2 mnt 9 dtk', when: 'Kemarin 14.39' },
  { id: 'absensi-lama', name: 'absensi-lama', path: 'clients › arsip › absensi-lama', href: '/proyek/absensi-lama', state: 'done', stateLabel: 'Selesai',
    milestoneText: 'Inti · 6/6 item', runMeta: '140,3 rb token · 2 j 10 mnt', when: '2 Nov' },
];
export const boardProps: Omit<ProjectListViewProps, 'status'> = {
  totals: { needsYou: 1, readyReview: 1, active: 2, maxRuns: 3, failed: 1, limitPaused: 1, earliestReset: '17.00' },
  attention, running, limited, quiet, sampleLabel: 'Data contoh, kecuali 07_Sandbox',
};
export const zeroTotals = { needsYou: 0, readyReview: 0, active: 0, maxRuns: 3, failed: 0, limitPaused: 0, earliestReset: null };

// Pohon folder contoh di bawah folder kerja
const tree: Record<string, string[]> = {
  [R]: ['07_Sandbox', 'clients', 'ryama-kit'],
  [`${R}/clients`]: ['absensi-cabang', 'arsip', 'katalog-toko', 'toconnect'],
  [`${R}/clients/arsip`]: ['absensi-lama'],
  [`${R}/ryama-kit`]: ['docs', 'plugins'],
  [`${R}/ryama-kit/plugins`]: ['crew-control', 'flow-viewer'],
};
const runningPaths = new Set([`${R}/clients/toconnect`, `${R}/ryama-kit/plugins/crew-control`]);
export const ROOT_PATH = R;
export const segmentsOf = (path: string) => ['01_Workspace', ...path.slice(R.length).split('/').filter(Boolean)];
export const crumbsOf = (path: string) => segmentsOf(path).map((name, i, all) => ({ name, path: [R, ...all.slice(1, i + 1)].join('/') }));
export const foldersOf = (path: string): FolderItem[] =>
  (tree[path] ?? []).map((name) => ({ name, path: `${path}/${name}`, running: runningPaths.has(`${path}/${name}`) }));
export const addFolder = (path: string, name: string) => { tree[path] = [...(tree[path] ?? []), name].sort(); tree[`${path}/${name}`] = []; };
export const recent: FolderItem[] = [
  { name: 'toconnect', path: `${R}/clients/toconnect`, relPath: 'clients › toconnect', running: true },
  { name: 'crew-control', path: `${R}/ryama-kit/plugins/crew-control`, relPath: 'ryama-kit › plugins › crew-control', running: true },
  { name: 'absensi-cabang', path: `${R}/clients/absensi-cabang`, relPath: 'clients › absensi-cabang' },
  { name: '07_Sandbox', path: `${R}/07_Sandbox`, relPath: '07_Sandbox' },
];
export const commands = [
  { id: 'mulai-ide', label: 'Mulai dari ide', placeholder: 'Aplikasi absensi untuk 3 cabang…', needsText: true },
  { id: 'lanjut-backlog', label: 'Lanjut backlog', placeholder: 'Catatan tambahan (opsional)', needsText: false },
  { id: 'prompt-bebas', label: 'Prompt bebas', placeholder: 'Apa yang mau dikerjakan?', needsText: true },
];
export const teams = [{ id: 'fullstack', label: 'Fullstack', description: 'prd, ux, ui-designer, fe, be, qa, cyber' }];
export const models = [
  { id: 'opus', label: 'Opus', description: 'Paling mampu, paling boros kuota' },
  { id: 'sonnet', label: 'Sonnet', description: 'Seimbang untuk kerja harian' },
  { id: 'haiku', label: 'Haiku', description: 'Tercepat dan paling hemat' },
];
