import { useState, type MouseEvent } from 'react';
import { Mark, type MarkKind } from '../parts/Mark.js';
import { Pips } from '../parts/Pips.js';
import { withSeps } from '../parts/Sep.js';
import { Icon } from '../parts/icons.js';
import './ProjectListView.css';

export type ProjectState = MarkKind;

export interface ProjectRow {
  id: string;
  /** Nama folder. */
  name: string;
  /** Path relatif dari folder kerja, segmen dipisah " › ". */
  path: string;
  /** Tautan Layar proyek (seluruh baris). */
  href: string;
  state: ProjectState;
  /** Teks status: "Butuh kamu", "Siap review", "Gagal", "Terputus", "Jalan", "Jeda limit", "Selesai", "Dihentikan". */
  stateLabel: string;
  /** Jumlah butuh kamu (pertanyaan + izin + usulan); > 0 ditulis di status. */
  pending?: number;
  /** Baris kedua status, mis. "Pertanyaan dari ui-designer". Boleh berisi " · ". */
  detail?: string;
  /** Sesi dari Claude desktop (F10). */
  fromDesktop?: boolean;
  /** Progres milestone; untuk baris diam boleh diganti milestoneText. */
  milestone?: { name: string; done: number; total: number; now?: number; bad?: number; batch?: string };
  /** Teks pengganti milestone, mis. "Prompt bebas · 31 langkah". */
  milestoneText?: string;
  /** Kolom Run baris 1, mis. "fe, be jalan". */
  runLine?: string;
  /** Kolom Run baris 2, mis. "412,6 rb token · 1 j 48 mnt". */
  runMeta?: string;
  /** Aktivitas terakhir, sudah diformat ("10.42", "Kemarin 16.20"). */
  when: string;
  /** Aksi utama baris: Jawab (Butuh kamu) atau Review (Siap review). */
  action?: { kind: 'answer' | 'review'; href: string };
  /** Gagal/Terputus: tampilkan [Lanjutkan] dan "Lihat alasan" bila reason ada. */
  canResume?: boolean;
  reason?: string;
}

export interface ProjectTotals {
  needsYou: number;
  readyReview: number;
  active: number;
  maxRuns: number;
  failed: number;
  limitPaused: number;
  /** Jam reset paling awal ("17.00"), bila ada jeda limit. */
  earliestReset?: string | null;
}

export interface ProjectListViewProps {
  /** ready = ada data; loading = muat pertama (kerangka); empty = belum ada run sama sekali. */
  status: 'ready' | 'loading' | 'empty';
  totals: ProjectTotals;
  /** Butuh kamu (urut pertanyaan tertua), lalu siap review, lalu gagal/terputus. Kosong = kelompok tidak tampil. */
  attention: ProjectRow[];
  /** Jalan (state run). */
  running: ProjectRow[];
  /** Jeda limit (subkelompok di bawah Jalan). */
  limited: ProjectRow[];
  /** Diam, urut aktivitas terakhir. */
  quiet: ProjectRow[];
  /** Polling gagal: jam data terakhir ("14.02"). Data lama tetap tampil. */
  staleAt?: string | null;
  onRetry?: () => void;
  /** Baris "Aktifkan pemberitahuan": tampil bila true. */
  showNotifyPrompt?: boolean;
  onEnableNotify?: () => void;
  onDismissNotify?: () => void;
  /** Run yang sedang dilanjutkan (tombol Lanjutkan sibuk). */
  resumingId?: string | null;
  onResume?: (id: string) => void;
  /** Klik nama/baris atau tombol aksi; fe boleh preventDefault lalu navigasi lewat router. */
  onOpen?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  newRunHref?: string;
  onOpenSettings?: () => void;
  /** Label data contoh (pratinjau). */
  sampleLabel?: string;
  /** Pengumuman pembaca layar (role=status). */
  announce?: string;
}

type Kpi = { key: string; mark: MarkKind; value: number; suffix?: string; label: string; sub?: string; href: string; title?: string };

export function ProjectListView(p: ProjectListViewProps) {
  const t = p.totals;
  const all: Kpi[] = [
    { key: 'ask', mark: 'ask', value: t.needsYou, label: 'Butuh kamu', href: '#perlu' },
    { key: 'review', mark: 'review', value: t.readyReview, label: 'Siap review', href: '#perlu' },
    { key: 'run', mark: 'run', value: t.active, suffix: `/${t.maxRuns}`, label: 'Run aktif', href: '#jalan', title: `Run yang memakai slot, dari batas ${t.maxRuns} run bersamaan` },
    { key: 'bad', mark: 'bad', value: t.failed, label: 'Gagal atau terputus', href: '#perlu' },
    { key: 'limit', mark: 'limit', value: t.limitPaused, label: 'Jeda limit', sub: t.earliestReset ? `lanjut ${t.earliestReset}` : undefined, href: '#jalan' },
  ];
  const kpis = all.filter((k) => k.value > 0);
  const ready = p.status === 'ready';
  const open = (e: MouseEvent<HTMLAnchorElement>) => p.onOpen?.(e.currentTarget.getAttribute('href') ?? '', e);
  const newRun = p.newRunHref ?? '/baru';

  return (
    <div className="pl">
      <header className="pl-head">
        <div className="pl-title">
          <h1>Proyek</h1>
          {p.sampleLabel && <span className="pl-sample">{p.sampleLabel}</span>}
        </div>
        {p.onOpenSettings && (
          <button type="button" className="pl-settings" aria-label="Pengaturan" onClick={p.onOpenSettings}>{Icon.settings()}</button>
        )}
        {ready && kpis.length > 0 && (
          <ul className="pl-kpis" aria-label="Ringkasan semua proyek">
            {kpis.map((k) => (
              <li key={k.key}>
                <a className="pl-kpi" href={k.href} title={k.title}>
                  <Mark kind={k.mark} small />
                  <b className="pl-kpi__num">{k.value}{k.suffix && <small>{k.suffix}</small>}</b>
                  <span className="pl-kpi__label">{k.label}</span>
                  {k.sub && <span className="pl-kpi__sub">{k.sub}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
        <a className="btn btn--primary pl-new" href={newRun} onClick={open}>Run baru</a>
      </header>

      {p.staleAt ? (
        <p className="pl-line pl-line--stale">
          {Icon.alert()}
          <span>Tidak bisa memuat ulang. Ini data terakhir pukul {p.staleAt}.</span>
          {p.onRetry && <button className="link-btn" type="button" onClick={p.onRetry}>Coba lagi</button>}
        </p>
      ) : p.showNotifyPrompt && (
        <p className="pl-line">
          <span className="pl-line__text">Pemberitahuan ke HP belum aktif.</span>
          <button className="btn btn--sm" type="button" onClick={p.onEnableNotify}>Aktifkan</button>
          <button className="icon-btn pl-line__x" type="button" aria-label="Tutup pemberitahuan" onClick={p.onDismissNotify}>{Icon.close()}</button>
        </p>
      )}

      {p.status === 'loading' && (
        <div className="pl-board pl-sk" aria-busy="true" aria-label="Memuat proyek">
          <ul className="pl-panel">
            {[0, 1, 2].map((i) => (
              <li key={i} className="pl-row"><span className="mark" /><span className="skel" /><span className="skel" /><span className="skel" /><span className="skel" /><span className="skel" /><span /></li>
            ))}
          </ul>
        </div>
      )}

      {p.status === 'empty' && (
        <section className="pl-empty" aria-labelledby="pl-kosong">
          <div className="pl-empty__line" aria-hidden="true"><i /><b /><i /></div>
          <p id="pl-kosong">Belum ada run.</p>
          <a className="btn btn--primary" href={newRun} onClick={open}>Run baru</a>
        </section>
      )}

      {ready && (
        <div className="pl-board" id="papan" tabIndex={-1}>
          {p.attention.length > 0 && (
            <section className="pl-group" id="perlu" aria-labelledby="perlu-h">
              <div className="pl-ghead pl-cols">
                <span />
                <span className="pl-gtitle"><h2 id="perlu-h">Perlu diurus</h2><span>{p.attention.length}</span></span>
                <span aria-hidden="true">Keadaan</span><span aria-hidden="true">Milestone</span><span aria-hidden="true">Run</span>
                <span aria-hidden="true">Terakhir</span><span />
              </div>
              <ul className="pl-panel">{p.attention.map((r) => <Row key={r.id} r={r} p={p} open={open} />)}</ul>
            </section>
          )}
          {(p.running.length > 0 || p.limited.length > 0) && (
            <section className="pl-group" id="jalan" aria-labelledby="jalan-h">
              <div className="pl-ghead"><h2 id="jalan-h">Jalan</h2><span>{p.running.length}</span></div>
              {p.running.length > 0 && <ul className="pl-panel">{p.running.map((r) => <Row key={r.id} r={r} p={p} open={open} />)}</ul>}
              {p.limited.length > 0 && (
                <>
                  <h3 className="pl-gsub" id="limit-h">Jeda limit<span>{p.limited.length}</span></h3>
                  <ul className="pl-panel" aria-labelledby="limit-h">{p.limited.map((r) => <Row key={r.id} r={r} p={p} open={open} />)}</ul>
                </>
              )}
            </section>
          )}
          {p.quiet.length > 0 && (
            <section className="pl-group" id="diam" aria-labelledby="diam-h">
              <div className="pl-ghead"><h2 id="diam-h">Diam</h2><span>{p.quiet.length}</span></div>
              <ul>{p.quiet.map((r) => <Row key={r.id} r={r} p={p} open={open} quiet />)}</ul>
            </section>
          )}
        </div>
      )}

      <p className="vh" role="status" aria-live="polite">{p.announce}</p>
    </div>
  );
}

function Row({ r, p, open, quiet = false }: { r: ProjectRow; p: ProjectListViewProps; open: (e: MouseEvent<HTMLAnchorElement>) => void; quiet?: boolean }) {
  const [why, setWhy] = useState(false);
  const reasonId = `alasan-${r.id}`;
  const label = r.pending && r.pending > 0 ? `${r.pending} butuh kamu` : r.stateLabel;
  const resuming = p.resumingId === r.id;
  return (
    <li className={`pl-row pl-row--${r.state}${quiet ? ' pl-row--quiet' : ''}`}>
      <Mark kind={r.state} />
      <div className="pl-who">
        <a className="pl-name" translate="no" href={r.href} onClick={open}>{r.name}</a>
        <span className="pl-path mono" translate="no" title={r.path}>{r.path}</span>
      </div>
      <div className="pl-state">
        <span className="pl-st">{label}{r.fromDesktop && <span className="pl-chip">dari desktop</span>}</span>
        {r.detail && <span className="pl-det">{withSeps(r.detail)}</span>}
      </div>
      <div className="pl-ms">
        {r.milestone ? (
          <>
            <Pips total={r.milestone.total} done={r.milestone.done} now={r.milestone.now} bad={r.milestone.bad} />
            <span className="pl-ms__t">
              <b>{withSeps(`${r.milestone.name} · ${r.milestone.done}/${r.milestone.total} item`)}</b>
              {r.milestone.batch && withSeps(` · ${r.milestone.batch}`)}
            </span>
          </>
        ) : r.milestoneText ? <span className="pl-ms__t">{withSeps(r.milestoneText)}</span> : null}
      </div>
      <div className="pl-run">
        {r.runLine && <span>{r.runLine}</span>}
        {r.runMeta && <span>{withSeps(r.runMeta)}</span>}
      </div>
      <span className="pl-when">{r.when}</span>
      <div className="pl-act">
        {r.action?.kind === 'answer' && <a className="btn btn--ask" href={r.action.href} onClick={open}>Jawab</a>}
        {r.action?.kind === 'review' && <a className="btn" href={r.action.href} onClick={open}>Review</a>}
        {r.canResume && (
          <button className="btn" type="button" aria-busy={resuming || undefined} onClick={() => !resuming && p.onResume?.(r.id)}>
            {resuming ? 'Melanjutkan…' : 'Lanjutkan'}
          </button>
        )}
        {r.canResume && r.reason && (
          <button className="link-btn" type="button" aria-expanded={why} aria-controls={reasonId} onClick={() => setWhy((w) => !w)}>
            {why ? 'Tutup alasan' : 'Lihat alasan'}
          </button>
        )}
      </div>
      {r.reason && <p className="pl-reason" id={reasonId} hidden={!why}>{r.reason}</p>}
    </li>
  );
}
