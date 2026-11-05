// Data contoh berlabel (`npm run seed` -> data/demo.db). Bukan data produksi: pengaturan `demo_label` menandainya.
// (a) run 07_Sandbox diimpor lewat transkrip (recordSessionUsage); (b) skenario tim fullstack 10 agent; (c) run di tiap status.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Message, MessageV2, Run, Tokens } from './contract/index.js';
import { Store } from './store/index.js';
import { projectId } from './projects.js';
import { recordSessionUsage } from './transcripts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEMO_LABEL = 'Data contoh';
const NOW = Date.parse('2026-11-05T03:48:00Z'); // 10.48 WIB, momen mockup
const at = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();
const sha = (s: string) => createHash('sha1').update(s).digest('hex');
const tk = (input: number, output: number, cacheRead: number, cacheWrite: number): Tokens => ({ input, output, cacheRead, cacheWrite });
const AGENTS: [string, string][] = [['prd', 'opus'], ['ux', 'opus'], ['architect', 'opus'], ['backlog', 'sonnet'], ['ui-designer', 'opus'], ['fe', 'sonnet'], ['be', 'sonnet'], ['ui-critic', 'opus'], ['qa', 'sonnet'], ['cyber', 'sonnet']];

export function seedDemo(file: string, opts: { transcriptRoot?: string } = {}): Store {
  for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true }); // hanya berkas demo yang diminta
  const s = new Store(file);
  s.setSetting('demo_label', DEMO_LABEL);
  let n = 0;
  const proj = (name: string, rel: string, lastCmd: string | null, lastMin: number, p = `/demo/${rel}`) => {
    const id = projectId(p);
    s.saveProject({ id, path: p, name, teamId: 'fullstack', batchSize: null, lastCommandId: lastCmd, lastActivityAt: at(lastMin) });
    return { id, path: p, name };
  };
  const run = (p: { id: string; path: string; name: string }, o: Omit<Partial<Run>, "origin"> & { id?: string; cmd?: string; title: string; startMin: number; model?: string; origin?: 'dashboard' | 'desktop' }) => {
    const r: Run = {
      id: o.id ?? `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, project: p.path, projectName: p.name, prompt: o.prompt ?? o.title,
      model: o.model ?? 'sonnet', origin: 'dashboard', status: o.status ?? 'done', reason: o.reason ?? null, lastLog: null,
      sessionId: o.sessionId ?? null, pending: o.pending ?? 0, tokens: o.tokens ?? null, startedAt: at(o.startMin),
      endedAt: o.endedAt ?? null, durationMs: o.durationMs ?? null,
    };
    s.saveRun(r, { projectId: p.id, teamId: 'fullstack', commandId: o.cmd ?? 'bebas', title: o.title, origin: o.origin ?? 'dashboard' });
    return r;
  };
  const msg = (r: Run, kind: MessageV2['kind'], text: string, minAgo: number, extra: Partial<MessageV2> = {}) => {
    const m: MessageV2 = { id: `m-${r.id.slice(-6)}-${++n}`, runId: r.id, kind, text, createdAt: at(minAgo), state: null, questions: null, tool: null, answer: null, answeredAt: null, sentOnResume: false, source: 'session', ref: null, proposal: null, ...extra };
    s.saveMessage(m);
    return m;
  };
  const sess = (r: Run, id: string, kind: 'batch' | 'turn', startMin: number, end: 'normal' | 'stopped' | 'failed' | 'limit' | null, tokens: Tokens, batchId: string | null = null) => {
    s.saveSession({ id, runId: r.id, batchId, kind, startedAt: at(startMin), endedAt: end ? at(startMin - 5) : null, end, modelUsed: r.model, tokens });
    return id;
  };
  const ms = (p: { id: string }, key: string, name: string, status: 'running' | 'ready_review' | 'accepted', run: Run, count: number) =>
    s.saveMilestone({ id: `ms-${p.id}-${key}`, projectId: p.id, backlogKey: key, name, kind: 'fase', status, reviewRound: 0, runId: run.id, initialItemCount: count, proposedAt: at(400), approvedAt: at(390), runningAt: at(380), readyReviewAt: status === 'ready_review' ? at(60) : null, acceptedAt: status === 'accepted' ? at(2000) : null });
  const items = (p: { id: string }, key: string, titles: string[], done: number, running: number) =>
    titles.forEach((title, i) => s.saveItem({ projectId: p.id, itemKey: `${key}-${i + 1}`, milestoneId: `ms-${p.id}-${key}`, title, agent: i % 2 ? 'be' : 'fe', type: i % 2 ? 'be' : 'fe', status: i < done ? 'done' : i < done + running ? 'in_progress' : 'todo', attempts: i < done ? 1 : 0, origin: 'asli', fixOf: null, firstSeenAt: at(400), doneAt: i < done ? at(300 - i) : null, doneBatchId: null, tokens: tk(0, 0, 0, 0) }));

  // (a) 07_Sandbox: run asli (diimpor lewat transkrip; tanpa milestone/batch). Sumber transkrip: fixture bila run asli tidak ada.
  const sb = proj('07_Sandbox', '01_Workspace/07_Sandbox', 'bebas', 1400);
  const sbRun = run(sb, { id: 'ced3b44a-0000-4000-8000-000000000001', title: 'Tes Crew Control: pertanyaan, izin, jeda, stop', startMin: 1511, model: 'haiku', status: 'stopped', reason: 'Dihentikan oleh pemilik.', sessionId: 'sess1', endedAt: at(1400), durationMs: 129_000, prompt: 'Ini tes Crew Control. Buat folder crew-tes dan kerja di dalamnya saja. Sebelum mulai, tanya saya dulu pakai pilihan ganda: warna apa untuk file warna.txt (Merah, Biru, Hijau). Setelah saya jawab, tulis warna itu ke crew-tes/warna.txt. Lalu coba tulis file ke ../../luar-tes.txt.' });
  sess(sbRun, 'sess1', 'turn', 1511, 'stopped', tk(0, 0, 0, 0));
  const u = recordSessionUsage(s, 'sess1', undefined, opts.transcriptRoot ?? path.join(ROOT, 'test/fixtures/transcripts'));
  if (u) s.saveRun({ ...sbRun, tokens: u.tokens }, { projectId: sb.id });
  msg(sbRun, 'question', 'Warna apa untuk file warna.txt?', 1510, { state: 'answered', answeredAt: at(1509.8), questions: [{ question: 'Warna apa untuk file warna.txt?', header: 'Warna', multiSelect: false, options: [{ label: 'Merah', description: 'Tulis "Merah" ke crew-tes/warna.txt' }, { label: 'Biru', description: null }, { label: 'Hijau', description: null }] }], answer: { from: 'dashboard', answers: { 'Warna apa untuk file warna.txt?': 'Biru' }, decision: null, reason: null } });
  msg(sbRun, 'permission', 'Izin untuk Write', 1509, { state: 'answered', answeredAt: at(1508.7), tool: { name: 'Write', summary: 'D:\\luar-tes.txt', why: 'Path di luar folder proyek: D:\\luar-tes.txt' }, answer: { from: 'dashboard', answers: null, decision: 'deny', reason: 'Jangan tulis di luar folder proyek. Selesai saja.' } });
  msg(sbRun, 'agent', 'Folder `crew-tes` sudah dibuat dan `crew-tes/warna.txt` berisi `Biru`. Penulisan ke `../../luar-tes.txt` ditolak.', 1508);
  msg(sbRun, 'system', 'Run selesai.', 1507);
  msg(sbRun, 'owner', 'Jalankan ping -n 60 127.0.0.1 lalu tulis d.txt di crew-tes.', 1500, { state: 'sent' });
  msg(sbRun, 'system', 'Dihentikan oleh pemilik.', 1400);

  // (b) Skenario tim fullstack 10 agent: toconnect, milestone UI 7/24, batch 2; fe+be paralel, ui-designer bertanya.
  const tc = proj('toconnect', 'clients/toconnect', 'backlog', 6);
  const tcRun = run(tc, { title: 'Lanjut backlog', cmd: 'backlog', startMin: 108, model: 'sonnet', status: 'needs_owner', pending: 1, sessionId: 'demo-tc-2', tokens: tk(1200, 61_000, 2_900_000, 350_400), prompt: '/fullstack-dev:run' });
  ms(tc, 'ui', 'UI', 'running', tcRun, 24);
  items(tc, 'ui', Array.from({ length: 24 }, (_, i) => (['Kerangka layar Riwayat', 'Paginasi daftar run'].concat(Array.from({ length: 22 }, (_, k) => `Item UI ${k + 3}`)))[i]), 7, 2);
  s.saveBatch({ id: 'b-tc-1', runId: tcRun.id, milestoneId: 'ms-' + tc.id + '-ui', number: 1, sessionId: 'demo-tc-1', itemKeys: ['ui-1', 'ui-2', 'ui-3', 'ui-4', 'ui-5', 'ui-6', 'ui-7'], commitHash: 'a1b2c3d', commitError: null, startedAt: at(108), endedAt: at(50), tokens: tk(800, 30_000, 1_500_000, 180_000) });
  s.saveBatch({ id: 'b-tc-2', runId: tcRun.id, milestoneId: 'ms-' + tc.id + '-ui', number: 2, sessionId: 'demo-tc-2', itemKeys: ['ui-8', 'ui-9'], commitHash: null, commitError: null, startedAt: at(48), endedAt: null, tokens: tk(400, 31_000, 1_400_000, 170_400) });
  sess(tcRun, 'demo-tc-1', 'batch', 108, 'normal', tk(800, 30_000, 1_500_000, 180_000), 'b-tc-1');
  sess(tcRun, 'demo-tc-2', 'batch', 48, null, tk(400, 31_000, 1_400_000, 170_400), 'b-tc-2');
  const act: Record<string, [ 'running' | 'done' | 'failed', number, string | null ]> = { 'ui-designer': ['running', 1, null], fe: ['running', 3, 'ui-8'], be: ['running', 2, 'ui-9'], prd: ['done', 1, null], ux: ['done', 1, null], architect: ['done', 1, null], backlog: ['done', 1, null] };
  for (const [agent, model] of AGENTS) { // ui-critic, qa, cyber tanpa aktivitas = Siap
    const a = act[agent]; if (!a) continue;
    s.saveActivity({ id: `demo-act-${agent}`, runId: tcRun.id, sessionId: 'demo-tc-2', agent, inTeam: true, itemKey: a[2], round: a[1], status: a[0], startedAt: at(40), endedAt: a[0] === 'done' ? at(30) : null, modelUsed: model, toolCount: 12, files: agent === 'fe' ? ['web/src/riwayat/RiwayatList.tsx'] : [], tokens: tk(100, 4000, 200_000, 20_000) });
  }
  msg(tcRun, 'question', 'Kartu bukti yang tidak punya gambar: tampilkan apa? (dari ui-designer)', 6, { state: 'pending', ref: { batchId: 'b-tc-2' }, questions: [{ question: 'Kartu bukti yang tidak punya gambar: tampilkan apa?', header: 'Bukti', multiSelect: false, options: [{ label: 'Ringkasan teks', description: null }, { label: 'Ikon jenis berkas', description: null }, { label: 'Keduanya', description: null }] }] });
  msg(tcRun, 'milestone', 'Milestone UI dimulai: 24 item.', 108, { source: 'backlog', ref: { milestoneId: `ms-${tc.id}-ui` } });

  // (c) Run dalam tiap status. Proyek lain mengikuti docs/mockups/data-mockup.md bagian 4.
  const rk = proj('ryama-kit', 'ryama-kit', 'backlog', 51);
  const rkRun = run(rk, { title: 'Lanjut backlog', cmd: 'backlog', startMin: 235, status: 'ready_review', sessionId: 'demo-rk', tokens: tk(900, 40_000, 2_000_000, 197_200), endedAt: at(51), durationMs: 185 * 60_000 });
  ms(rk, 'rilis', 'Rilis 0.9', 'ready_review', rkRun, 12); items(rk, 'rilis', Array.from({ length: 12 }, (_, i) => `Item rilis ${i + 1}`), 12, 0);
  msg(rkRun, 'milestone', 'Milestone Rilis 0.9 siap direview: 12 dari 12 item selesai.', 51, { source: 'backlog', ref: { milestoneId: `ms-${rk.id}-rilis` } });
  const ac = proj('absensi-cabang', 'clients/absensi-cabang', 'backlog', 93);
  const acRun = run(ac, { title: 'Lanjut backlog', cmd: 'backlog', startMin: 133, status: 'failed', reason: 'Item rekap-5 "Rekap per cabang" gagal pada putaran 3.', tokens: tk(500, 20_000, 900_000, 75_900), endedAt: at(93), durationMs: 41 * 60_000 });
  ms(ac, 'inti', 'Inti', 'running', acRun, 9); items(ac, 'inti', Array.from({ length: 9 }, (_, i) => (i === 4 ? 'Rekap per cabang' : `Item inti ${i + 1}`)), 4, 0);
  const cc = proj('crew-control', 'ryama-kit/plugins/crew-control', 'backlog', 1, ROOT);
  const ccRun = run(cc, { title: 'Lanjut backlog', cmd: 'backlog', startMin: 22, status: 'running', sessionId: 'demo-cc', tokens: tk(300, 12_000, 600_000, 41_700) });
  ms(cc, 'server', 'Server', 'running', ccRun, 10); items(cc, 'server', Array.from({ length: 10 }, (_, i) => `Item server ${i + 1}`), 3, 1);
  s.saveBatch({ id: 'b-cc-1', runId: ccRun.id, milestoneId: `ms-${cc.id}-server`, number: 1, sessionId: 'demo-cc', itemKeys: ['server-4'], commitHash: null, commitError: null, startedAt: at(22), endedAt: null, tokens: tk(300, 12_000, 600_000, 41_700) });
  sess(ccRun, 'demo-cc', 'batch', 22, null, tk(300, 12_000, 600_000, 41_700), 'b-cc-1');
  s.saveActivity({ id: 'demo-act-cc-be', runId: ccRun.id, sessionId: 'demo-cc', agent: 'be', inTeam: true, itemKey: 'server-4', round: 1, status: 'running', startedAt: at(10), endedAt: null, modelUsed: 'sonnet', toolCount: 5, files: [], tokens: tk(50, 2000, 100_000, 8000) });
  const ev = 'docs/mockups/arah-b/bukti-contoh';
  const evDir = path.join(ROOT, ev);
  for (const f of fs.existsSync(evDir) ? fs.readdirSync(evDir).filter((x) => x.endsWith('.png')).sort() : []) {
    const rel = `${ev}/${f}`;
    s.saveEvidence({ id: sha(`${cc.id}|server-4|${rel}`), projectId: cc.id, itemKey: 'server-4', kind: 'image', path: rel, caption: `Contoh: ${f.replace('.png', '').replace(/-/g, ' ')}`, size: fs.statSync(path.join(evDir, f)).size, present: true, checkedAt: at(5) });
  }
  const kt = proj('katalog-toko', 'clients/katalog-toko', 'backlog', 283);
  const ktRun = run(kt, { title: 'Lanjut backlog', cmd: 'backlog', startMin: 355, status: 'limit_paused', reason: 'Batas pemakaian tercapai; lanjut sendiri 17.00.', sessionId: 'demo-kt', tokens: tk(600, 25_000, 1_000_000, 156_100) });
  ms(kt, 'katalog', 'Katalog', 'running', ktRun, 8); items(kt, 'katalog', Array.from({ length: 8 }, (_, i) => `Item katalog ${i + 1}`), 5, 0);
  const fv = proj('flow-viewer', 'ryama-kit/plugins/flow-viewer', null, 1650);
  run(fv, { title: 'Sesi dari desktop', cmd: 'bebas', startMin: 1676, origin: 'desktop', status: 'done', tokens: tk(700, 30_000, 800_000, 47_200), endedAt: at(1650), durationMs: 26 * 60_000 });
  const al = proj('absensi-lama', 'clients/arsip/absensi-lama', 'backlog', 4400);
  const alRun = run(al, { title: 'Lanjut backlog', cmd: 'backlog', startMin: 4540, status: 'done', tokens: tk(1000, 50_000, 3_000_000, 89_300), endedAt: at(4410), durationMs: 130 * 60_000 });
  ms(al, 'inti', 'Inti', 'accepted', alRun, 6); items(al, 'inti', Array.from({ length: 6 }, (_, i) => `Item inti ${i + 1}`), 6, 0);
  run(al, { title: 'Coba awal (terputus)', startMin: 9000, status: 'disconnected', reason: 'Server dashboard berhenti atau dimulai ulang saat run berjalan.', endedAt: at(8990), durationMs: 10 * 60_000 });
  const ph = proj('portal-hr', 'clients/portal-hr', 'bebas', 12); // tambahan di luar mockup: satu-satunya contoh status Dijeda
  run(ph, { title: 'Rapikan form cuti', startMin: 30, status: 'paused', sessionId: 'demo-ph', tokens: tk(80, 3000, 120_000, 9000) });
  return s;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = seedDemo(path.join(ROOT, 'data', 'demo.db'));
  console.log(`demo.db siap: ${s.listProjects().length} proyek, ${s.listRuns(undefined, 1000).length} run (${DEMO_LABEL}).`);
  s.close();
}
