// Data contoh Chat + Detail agent untuk pratinjau (bukan API). ?chat=pertanyaan|banyak|lainnya|izin|tolak|milestone|keputusan|sistem|terjawab|bacasaja|panjang  &tab=detail  &agent=ui-designer|fe|ui-critic
import { useEffect, useState } from 'react';
import { ChatPanel, type ChatItem, type ChatActions, type SideTab } from '../chat/ChatPanel.js';
import { AgentDetail, type AgentDetailData } from '../chat/AgentDetail.js';
import type { ComposerMode } from '../chat/Composer.js';

const qs = new URLSearchParams(location.search);

export const agentData: Record<string, AgentDetailData> = {
  'ui-designer': {
    name: 'ui-designer', role: 'Merancang dan membangun komponen tampilan dari desain yang sudah disetujui.', status: 'ask',
    task: 'Kartu bukti di galeri Review: bentuk untuk bukti tanpa gambar.', modelDeclared: 'sonnet', modelUsed: 'sonnet',
    skills: ['design-principles', 'ui-craft', 'antislop-ui', 'ux-writing-id'], tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep'], mcp: ['playwright'],
    steps: [{ tool: 'Read', summary: 'docs/DESIGN.md', time: '10.31' }, { tool: 'Write', summary: 'web/src/ui/review/EvidenceCard.tsx', time: '10.36' }, { tool: 'Bash', summary: 'node run-audit.js', time: '10.40' }],
    files: [{ path: 'web/src/ui/review/EvidenceCard.tsx', change: 'baru' }, { path: 'docs/KOMPONEN.md', change: 'ubah' }],
    tokens: '58,2 rb token', duration: '11 mnt 4 dtk',
    evidence: [{ label: 'Screenshot kartu bukti', note: 'audit-375.png · audit-1440.png' }, { label: 'Audit ui-craft', note: '0 tinggi · 1 sedang' }],
  },
  fe: {
    name: 'fe', role: 'Menyambung komponen tampilan ke API, rute, dan state.', status: 'run', statusText: 'Jalan · putaran 3',
    task: 'Kerangka layar Riwayat.', modelDeclared: 'sonnet', modelUsed: 'opus',
    skills: ['ponytail', 'security-checklists'], tools: ['Read', 'Write', 'Edit', 'Bash'], mcp: [],
    steps: [{ tool: 'Write', summary: 'web/src/riwayat/RiwayatList.tsx', time: '10.42' }],
    files: [{ path: 'web/src/riwayat/RiwayatList.tsx', change: 'baru' }], tokens: '31,7 rb token', duration: '6 mnt 12 dtk', evidence: [],
  },
  'ui-critic': {
    name: 'ui-critic', role: 'Menilai layar baru terhadap rancangan dan prinsip desain, tanpa mengubah kode.', status: 'ready',
    modelDeclared: 'sonnet', skills: ['design-principles', 'ui-craft', 'ux-writing-id'], tools: ['Read', 'Grep', 'Bash'], mcp: ['playwright'],
    steps: [], files: [], evidence: [],
  },
};

const NOTE = [
  { kind: 'user', id: 'u1', text: 'Lanjut backlog' },
  { kind: 'system', id: 's1', variant: 'batch', text: 'Batch 2 dimulai · fe dan be', detail: [{ label: 'Item', value: 'Kerangka layar Riwayat, Paginasi daftar run' }] },
  { kind: 'tools', id: 't1', steps: [{ agent: 'fe', tool: 'Write', summary: 'web/src/riwayat/RiwayatList.tsx' }, { agent: 'be', tool: 'Bash', summary: 'npm test -- runs' }] },
  { kind: 'agent', id: 'a1', from: 'orkestrator', time: '10.42', body: <p>fe mengerjakan kerangka layar Riwayat dan be mengerjakan paginasi daftar run. ui-designer butuh keputusanmu soal kartu bukti.</p> },
] as ChatItem[];

const Q1: ChatItem = { kind: 'question', id: 'q1', from: 'ui-designer', questions: [{ id: 'a', text: 'Kartu bukti yang tidak punya gambar: tampilkan apa?', options: [{ label: 'Ringkasan teks' }, { label: 'Ikon jenis berkas' }, { label: 'Keduanya' }] }] };
const QMULTI: ChatItem = {
  kind: 'question', id: 'q2', from: 'ui-designer', questions: [
    { id: 'a', text: 'Kartu bukti yang tidak punya gambar: tampilkan apa?', options: [{ label: 'Ringkasan teks', description: 'Dua baris hasil tes atau audit' }, { label: 'Ikon jenis berkas', description: 'Ikon garis + nama berkas' }] },
    { id: 'b', text: 'Informasi tambahan di kartu?', multi: true, options: [{ label: 'Waktu' }, { label: 'Nama agent' }, { label: 'Ukuran berkas' }] },
  ],
};
const PERM: ChatItem = { kind: 'permission', id: 'p1', from: 'fe', tool: 'Write', command: 'D:\\luar-tes.txt', why: 'Path di luar folder proyek', alwaysRule: 'Write di dalam folder proyek' };
const MILE: ChatItem = { kind: 'milestone', id: 'm1', from: 'backlog', name: 'Review dan bukti', items: ['Galeri bukti per item', 'Modal lihat penuh', 'Catatan perbaikan per item', 'Kirim perbaikan', 'Setujui milestone', 'Ringkasan angka di atas', 'Keadaan kosong galeri', 'Tes aksesibilitas modal'] };
const DEC: ChatItem = { kind: 'decision', id: 'd1', from: 'backlog', question: 'Item ini butuh keputusan: simpan bukti 30 hari atau selamanya?', context: 'Item bukti-retensi menunggu aturan simpan. Sesi lain tetap jalan.' };
const SYS: ChatItem[] = [
  { kind: 'system', id: 'y1', variant: 'limit', text: 'Jeda limit · lanjut otomatis 14.00' },
  { kind: 'system', id: 'y2', variant: 'rule', text: 'Aturan disimpan untuk proyek ini: Write di dalam folder proyek', action: { label: 'Batalkan', onClick: () => undefined } },
  { kind: 'system', id: 'y3', variant: 'bad', text: 'Run berhenti · item gagal 2 kali', detail: [{ label: 'Item', value: 'be-paginasi-runs' }, { label: 'Agent', value: 'be' }, { label: 'Alasan', value: 'Tes rekap gagal: 3 dari 18' }], action: { label: 'Lanjutkan', onClick: () => undefined } },
];
const RESOLVED: ChatItem[] = [
  { kind: 'question', id: 'r1', from: 'orkestrator', questions: [], resolved: { text: 'Warna apa untuk file warna.txt? → Biru · kamu, 14.02', tone: 'ok' } },
  { kind: 'permission', id: 'r2', from: 'fe', tool: 'Write', command: '', why: '', resolved: { text: 'Izin Write D:\\luar-tes.txt · Ditolak: jangan menulis di luar proyek', tone: 'no' } },
  { kind: 'permission', id: 'r3', from: 'fe', tool: 'Bash', command: '', why: '', resolved: { text: 'Izin Bash npm test · Dijawab dari desktop', tone: 'ok' } },
  { kind: 'question', id: 'r4', from: 'ui-designer', questions: [], resolved: { text: 'Pilih bentuk kartu · Dibatalkan: run berakhir', tone: 'cancel' } },
];

export function ChatDemo({ mode, agentId }: { mode: ComposerMode; agentId?: string | null }) {
  const c = qs.get('chat') ?? 'pertanyaan';
  const base: ChatItem[] = [...NOTE];
  if (c === 'pertanyaan' || c === 'lainnya') base.push(c === 'lainnya' ? ({ ...Q1, defaultOther: true } as ChatItem) : Q1);
  if (c === 'banyak') base.push(QMULTI);
  if (c === 'izin' || c === 'tolak') base.push(c === 'tolak' ? ({ ...PERM, defaultRejecting: true } as ChatItem) : PERM);
  if (c === 'milestone') base.push(MILE);
  if (c === 'keputusan') base.push(DEC);
  if (c === 'sistem') base.push(...SYS);
  if (c === 'terjawab') base.push(...RESOLVED);
  if (c === 'panjang') base.push(...SYS.slice(0, 1), ...RESOLVED, Q1, PERM);
  const [items, setItems] = useState<ChatItem[]>(c === 'bacasaja' ? [...NOTE, ...RESOLVED] : base);
  const [tab, setTab] = useState<SideTab>(qs.get('tab') === 'detail' ? 'detail' : 'chat');
  const [text, setText] = useState('');
  const resolve = (id: string, t: string, tone: 'ok' | 'no' = 'ok') =>
    setItems((xs) => xs.map((x) => (x.id === id && 'resolved' in x ? { ...x, resolved: { text: t, tone } } : x)) as ChatItem[]);
  const rule = (t: string): ChatItem => ({ kind: 'system', id: `rule-${Date.now()}`, variant: 'rule', text: `Aturan disimpan untuk proyek ini: ${t}`, action: { label: 'Batalkan', onClick: () => undefined } });
  const actions: ChatActions = {
    answerQuestion: (id, a) => resolve(id, `Pertanyaan → ${Object.values(a).map((v) => v.join(', ')).join(' · ')} · kamu, 10.44`),
    allow: (id) => resolve(id, 'Izin Write D:\\luar-tes.txt · Disetujui · kamu, 10.44'),
    deny: (id, r) => resolve(id, `Izin Write D:\\luar-tes.txt · Ditolak${r ? `: ${r}` : ''}`, 'no'),
    always: (id) => { resolve(id, 'Izin Write · Disetujui, aturan disimpan'); setItems((xs) => [...xs, rule('Write di dalam folder proyek')]); },
    approveMilestone: (id) => resolve(id, 'Milestone Review dan bukti · Disetujui · kamu, 10.44'),
    editMilestone: () => setText('Ubah milestone: '),
    answerDecision: (id, a) => resolve(id, `Keputusan → ${a} · kamu, 10.44`),
  };
  const waiting = items.filter((x) => x.kind !== 'user' && x.kind !== 'agent' && x.kind !== 'tools' && x.kind !== 'system' && !('resolved' in x && x.resolved)).length;
  const sel = agentId ?? qs.get('agent') ?? 'ui-designer';
  useEffect(() => { if (agentId) setTab('detail'); }, [agentId]);
  return (
    <ChatPanel
      tab={tab} onTabChange={setTab} items={items} actions={actions} waiting={waiting}
      readOnly={c === 'bacasaja' ? 'Run lama dari Riwayat. Pesan tidak bisa dikirim dari sini.' : undefined}
      composer={{ mode, value: text, onChange: setText, onSend: () => { setItems((xs) => [...xs, { kind: 'user', id: `u-${xs.length}`, text, pending: mode === 'paused' ? 'Menunggu Lanjut' : undefined }]); setText(''); }, onNewRun: () => undefined }}
      detail={<AgentDetail agent={agentData[sel] ?? null} />}
    />
  );
}
