import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { ChoiceMenu, type Choice } from '../parts/ChoiceMenu.js';
import { PathTrail } from '../parts/PathTrail.js';
import { Icon } from '../parts/icons.js';
import { PageHead } from './AppShell.js';
import { FolderPopover, type FolderPopoverProps } from './FolderPopover.js';
import './NewRunView.css';

export interface RunCommandOption {
  id: string;
  label: string;
  /** Contoh isi kotak ketik untuk perintah ini. */
  placeholder: string;
}

export interface NewRunNotice {
  /** busy = 409 project_busy, capacity = 409 capacity, needs-text = kotak kosong pada perintah yang butuh isi, failed = galat lain. */
  kind: 'busy' | 'capacity' | 'needs-text' | 'failed';
  message: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

export interface NewRunViewProps {
  /** Path folder kerja (sub kepala halaman). */
  workRoot: string;
  commands: RunCommandOption[];
  commandId: string;
  onCommandChange: (id: string) => void;
  text: string;
  onTextChange: (text: string) => void;
  maxLength?: number;
  /** Folder terpilih: segmen dari folder kerja (indeks 0 = nama folder kerja). */
  folder: { segments: string[]; isWorkRoot: boolean };
  /** Galat yang menempel di tombol folder (400: folder sudah tidak ada). */
  folderError?: string | null;
  folderOpen: boolean;
  onFolderOpenChange: (open: boolean) => void;
  /** Isi popover folder; onClose diisi komponen ini. */
  folderPicker: Omit<FolderPopoverProps, 'onClose' | 'id'>;
  teams: Choice[];
  teamId: string;
  onTeamChange: (id: string) => void;
  models: Choice[];
  modelId: string;
  onModelChange: (id: string) => void;
  submitting?: boolean;
  notice?: NewRunNotice | null;
  /** Enter di kotak ketik atau klik Mulai. Validasi isi kosong milik fe (notice needs-text). */
  onSubmit: () => void;
  /** Klik tautan aksi notice yang berupa href; fe boleh preventDefault lalu navigasi lewat router. */
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Pratinjau: menu Tim/Model terbuka. */
  openMenu?: 'team' | 'model';
}

const MAX_LINES = 12;

/** Run baru (UX.md 5a): chip perintah, kotak ketik, baris Folder / Tim / Model / Mulai. */
export function NewRunView(p: NewRunViewProps) {
  const max = p.maxLength ?? 20000;
  const box = useRef<HTMLTextAreaElement>(null);
  const folderWrap = useRef<HTMLDivElement>(null);
  const folderBtn = useRef<HTMLButtonElement>(null);
  const command = p.commands.find((c) => c.id === p.commandId);
  const rootName = p.folder.segments[0] ?? '';

  // Kotak ketik tumbuh 3-12 baris, lalu digulir.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    el.style.height = `${Math.min(Math.max(el.scrollHeight, lh * 3 + pad), lh * MAX_LINES + pad)}px`;
  }, [p.text]);

  useEffect(() => { box.current?.focus(); }, []);

  useEffect(() => {
    if (!p.folderOpen) return;
    const outside = (e: PointerEvent) => { if (!folderWrap.current?.contains(e.target as Node)) p.onFolderOpenChange(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [p.folderOpen, p.onFolderOpenChange]);

  const closeFolder = () => { p.onFolderOpenChange(false); folderBtn.current?.focus(); };

  const onBoxKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      if (!p.submitting) p.onSubmit();
    }
  };

  const onChipKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = p.commands[(i + d + p.commands.length) % p.commands.length]!;
    p.onCommandChange(next.id);
    (e.currentTarget.parentElement?.children[(i + d + p.commands.length) % p.commands.length] as HTMLElement | undefined)?.focus();
  };

  const n = p.notice;
  const near = p.text.length > max * 0.9;

  return (
    <div className="nr">
      <PageHead title="Run baru" sub={p.workRoot} subMono />
      <div className="nr-col">
        <div className="nr-chips" role="radiogroup" aria-label="Perintah tim">
          {p.commands.map((c, i) => {
            const on = c.id === p.commandId;
            return (
              <button
                key={c.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                className="nr-chip" onClick={() => p.onCommandChange(c.id)} onKeyDown={(e) => onChipKey(e, i)}
              >
                <span className="nr-chip__dot" aria-hidden="true" />{c.label}
              </button>
            );
          })}
        </div>

        <div className={`nr-card${n?.kind === 'needs-text' ? ' nr-card--invalid' : ''}`}>
          <label className="vh" htmlFor="nr-isi">{command ? `Isi untuk ${command.label}` : 'Apa yang mau dikerjakan'}</label>
          <textarea
            ref={box} id="nr-isi" name="isi" autoComplete="off" className="nr-box" rows={3} maxLength={max}
            placeholder={command?.placeholder ?? 'Apa yang mau dikerjakan?'}
            value={p.text} onChange={(e) => p.onTextChange(e.target.value)} onKeyDown={onBoxKey}
            aria-invalid={n?.kind === 'needs-text' || undefined}
            aria-describedby={['nr-petunjuk', n ? 'nr-notice' : '', p.folder.isWorkRoot ? 'nr-akar' : ''].filter(Boolean).join(' ')}
          />
          <div className="nr-bar">
            <div className="nr-folder" ref={folderWrap}>
              <button
                ref={folderBtn} type="button"
                className={`nr-folder__btn${p.folderError ? ' nr-folder__btn--bad' : ''}`}
                aria-haspopup="dialog" aria-expanded={p.folderOpen} aria-controls={p.folderOpen ? 'nr-folder-pop' : undefined}
                aria-describedby={p.folderError ? 'nr-folder-galat' : undefined}
                onClick={() => p.onFolderOpenChange(!p.folderOpen)}
              >
                {Icon.folder()}
                <span className="vh">Folder: </span>
                <PathTrail segments={p.folder.segments} />
                {Icon.chevronDown()}
              </button>
              {p.folderError && <p className="nr-folder__err" id="nr-folder-galat">{Icon.alert()}{p.folderError}</p>}
              {p.folderOpen && <FolderPopover {...p.folderPicker} id="nr-folder-pop" onClose={closeFolder} />}
            </div>
            <div className="nr-bar__end">
              <ChoiceMenu title="Tim" choices={p.teams} value={p.teamId} onChange={p.onTeamChange} align="end" defaultOpen={p.openMenu === 'team'} />
              <ChoiceMenu title="Model" choices={p.models} value={p.modelId} onChange={p.onModelChange} align="end" defaultOpen={p.openMenu === 'model'} />
              <button type="button" className="btn btn--primary nr-start" aria-busy={p.submitting || undefined} onClick={() => !p.submitting && p.onSubmit()}>
                {p.submitting ? 'Memulai…' : 'Mulai'}
              </button>
            </div>
          </div>
        </div>

        <div className="nr-under">
          <div className="nr-lines">
            {n && (
              <p className="nr-line nr-line--bad" id="nr-notice" role="alert">
                {Icon.alert()}
                <span>{n.message}</span>
                {n.action && (n.action.href
                  ? <a className="link-btn" href={n.action.href} onClick={(e) => p.onNavigate?.(n.action!.href!, e)}>{n.action.label}</a>
                  : <button type="button" className="link-btn" onClick={n.action.onClick}>{n.action.label}</button>)}
              </p>
            )}
            {p.folder.isWorkRoot && (
              <p className="nr-line" id="nr-akar">
                {Icon.warn()}
                <span>Agent bisa mengubah semua isi <b translate="no">{rootName}</b> tanpa bertanya.</span>
              </p>
            )}
          </div>
          <p className="nr-hint" id="nr-petunjuk">
            {near && <span className="nr-count">{p.text.length.toLocaleString('id-ID')} / {max.toLocaleString('id-ID')}</span>}
            Enter mengirim, Shift+Enter baris baru
          </p>
        </div>
      </div>
    </div>
  );
}
