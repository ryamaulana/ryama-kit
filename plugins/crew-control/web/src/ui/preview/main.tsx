// Pratinjau komponen ui/ dengan data contoh (bukan API).
// ?layar=kerangka|daftar|baru|proyek  &tema=gelap  &keadaan=…  (lihat KEADAAN di bawah)
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { AppShell, PageHead } from '../screens/AppShell.js';
import { ProjectListView } from '../screens/ProjectListView.js';
import { NewRunView, type NewRunNotice } from '../screens/NewRunView.js';
import { ProjectDemo } from './projectDemo.js';
import { ChatDemo } from './chatDemo.js';
import * as fx from './fixtures.js';
import './preview.css';

const qs = new URLSearchParams(location.search);
const tema = qs.get('tema');
const layar = qs.get('layar') ?? 'kerangka';
const keadaan = qs.get('keadaan') ?? '';
document.documentElement.dataset.theme = tema === 'gelap' ? 'dark' : 'light';

const noNav = (_d: unknown, e: { preventDefault(): void }) => e.preventDefault();

/** Daftar proyek. keadaan: kosong | memuat | galat | diam | tutup-pemberitahuan */
function Daftar() {
  const [notify, setNotify] = useState(keadaan !== 'tutup-pemberitahuan');
  const [why, setWhy] = useState('');
  const [resuming, setResuming] = useState<string | null>(null);
  const [stale, setStale] = useState(keadaan === 'galat' ? '10.48' : null);
  const diam = keadaan === 'diam';
  const status = keadaan === 'kosong' ? 'empty' : keadaan === 'memuat' ? 'loading' : 'ready';
  return (
    <ProjectListView
      {...fx.boardProps}
      status={status}
      totals={diam || status !== 'ready' ? fx.zeroTotals : fx.boardProps.totals}
      attention={diam ? [] : fx.attention}
      running={diam ? [] : fx.running}
      limited={diam ? [] : fx.limited}
      staleAt={stale}
      onRetry={() => { setStale(null); setWhy('Data dimuat ulang pukul 10.48.'); }}
      showNotifyPrompt={notify}
      onEnableNotify={() => { setNotify(false); setWhy('Pemberitahuan diminta. Pilih Izinkan di peramban.'); }}
      onDismissNotify={() => setNotify(false)}
      resumingId={resuming}
      onResume={(id) => { setResuming(id); setWhy(`${id} dilanjutkan dengan sesi baru.`); }}
      onOpen={(_h, e) => e.preventDefault()}
      onOpenSettings={() => setWhy('Panel Pengaturan dibuka.')}
      announce={why}
    />
  );
}

/** Run baru. keadaan: folder | folder-memuat | folder-kosong | folder-galat | folder-baru | folder-hilang | akar | sibuk | penuh | kosong-teks | mengirim | model | isi */
function Baru() {
  const startPath = keadaan === 'akar' ? fx.ROOT_PATH : `${fx.ROOT_PATH}/clients/toconnect`;
  const [cmd, setCmd] = useState('mulai-ide');
  const [text, setText] = useState(keadaan === 'isi' || keadaan === 'sibuk' || keadaan === 'penuh' || keadaan === 'mengirim'
    ? 'Tambahkan halaman rekap absensi per cabang dengan unduhan CSV. Data dari tabel absensi yang sudah ada.' : '');
  const [folder, setFolder] = useState(startPath);
  const [open, setOpen] = useState(keadaan.startsWith('folder'));
  const [browse, setBrowse] = useState(keadaan === 'folder-kosong' ? `${fx.ROOT_PATH}/clients/arsip/absensi-lama` : keadaan === 'folder-hilang' ? `${fx.ROOT_PATH}/clients` : `${fx.ROOT_PATH}/clients`);
  const [list, setList] = useState<'ready' | 'loading' | 'error'>(keadaan === 'folder-memuat' ? 'loading' : keadaan === 'folder-galat' ? 'error' : 'ready');
  const [team, setTeam] = useState('fullstack');
  const [model, setModel] = useState('sonnet');
  const [notice, setNotice] = useState<NewRunNotice | null>(
    keadaan === 'sibuk' ? { kind: 'busy', message: 'Proyek ini sudah punya run aktif.', action: { label: 'Buka run', href: '/proyek/toconnect' } }
    : keadaan === 'penuh' ? { kind: 'capacity', message: 'Sudah 3 run jalan bersamaan. Hentikan satu atau tunggu.', action: { label: 'Lihat proyek', href: '/' } }
    : keadaan === 'kosong-teks' ? { kind: 'needs-text', message: 'Tulis dulu apa yang mau dikerjakan.' } : null);
  const [submitting, setSubmitting] = useState(keadaan === 'mengirim');
  const [folderError, setFolderError] = useState(keadaan === 'folder-hilang' ? 'Folder clients › toconnect-lama sudah tidak ada.' : null);
  const [create, setCreate] = useState<{ status: 'idle' | 'saving' | 'error'; message?: string }>(
    keadaan === 'folder-baru' ? { status: 'error', message: 'Folder bernama absensi-cabang sudah ada di sini.' } : { status: 'idle' });

  const command = fx.commands.find((c) => c.id === cmd)!;
  const pick = (path: string) => { setFolder(path); setOpen(false); setFolderError(null); setNotice(null); };
  return (
    <NewRunView
      workRoot={fx.WORK_ROOT}
      commands={fx.commands}
      commandId={cmd}
      onCommandChange={(id) => { setCmd(id); setNotice(null); }}
      text={text}
      onTextChange={(t) => { setText(t); if (notice?.kind === 'needs-text') setNotice(null); }}
      folder={{ segments: fx.segmentsOf(folder), isWorkRoot: folder === fx.ROOT_PATH }}
      folderError={folderError}
      folderOpen={open}
      onFolderOpenChange={setOpen}
      folderPicker={{
        recent: fx.recent,
        crumbs: fx.crumbsOf(browse),
        folders: fx.foldersOf(browse),
        status: list,
        selectedPath: folder,
        onBrowse: (path) => { setBrowse(path); setList('ready'); },
        onPick: pick,
        onRetry: () => setList('ready'),
        onCreate: (name) => {
          if (fx.foldersOf(browse).some((f) => f.name === name)) { setCreate({ status: 'error', message: `Folder bernama ${name} sudah ada di sini.` }); return; }
          if (!/^[\w.-]+$/.test(name)) { setCreate({ status: 'error', message: 'Nama folder hanya boleh huruf, angka, titik, minus, dan garis bawah.' }); return; }
          fx.addFolder(browse, name); setCreate({ status: 'idle' }); pick(`${browse}/${name}`);
        },
        create,
        defaultCreating: keadaan === 'folder-baru',
      }}
      teams={fx.teams}
      teamId={team}
      onTeamChange={setTeam}
      models={fx.models}
      modelId={model}
      onModelChange={setModel}
      submitting={submitting}
      notice={notice}
      onSubmit={() => {
        if (command.needsText && !text.trim()) { setNotice({ kind: 'needs-text', message: 'Tulis dulu apa yang mau dikerjakan.' }); return; }
        setSubmitting(true);
      }}
      onNavigate={(_h, e) => e.preventDefault()}
      openMenu={keadaan === 'model' ? 'model' : undefined}
    />
  );
}

function Kerangka() {
  return (
    <>
      <PageHead title="Proyek" sub={fx.WORK_ROOT} subMono />
      <section className="pv-note" aria-labelledby="pv-judul">
        <h2 id="pv-judul">Pratinjau kerangka</h2>
        <p>Rel navigasi dan kepala halaman. Pilih layar lewat ?layar=daftar atau ?layar=baru.</p>
      </section>
    </>
  );
}

function Preview() {
  const [settings, setSettings] = useState(false);
  const current = layar === 'baru' ? 'baru' : 'proyek';
  if (layar === 'chat') return <div className="pv-chatonly"><ChatDemo mode={keadaan === 'jeda' ? 'paused' : keadaan === 'selesai' ? 'done' : keadaan === 'desktop' ? 'desktop' : keadaan === 'henti' ? 'stopped' : 'run'} /></div>;
  return (
    <AppShell nav={{ current, needsYou: layar === 'daftar' && keadaan ? 0 : 1, settingsOpen: settings, onNavigate: noNav, onOpenSettings: () => setSettings((s) => !s) }}>
      {layar === 'daftar' ? <Daftar /> : layar === 'baru' ? <Baru /> : layar === 'proyek' ? <ProjectDemo keadaan={keadaan} /> : <Kerangka />}
    </AppShell>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
