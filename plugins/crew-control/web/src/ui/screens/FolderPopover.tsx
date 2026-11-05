import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../parts/icons.js';
import './FolderPopover.css';

export interface FolderItem {
  name: string;
  /** Path nyata (dikirim balik di event). */
  path: string;
  /** Path relatif tampil, segmen dipisah " › " (hanya untuk Terakhir dipakai). */
  relPath?: string;
  /** Folder punya run aktif. */
  running?: boolean;
}

export interface FolderPopoverProps {
  id?: string;
  /** Terakhir dipakai, maks 5, terbaru dulu. */
  recent: FolderItem[];
  /** Jejak dari folder kerja (indeks 0) sampai folder yang sedang dibuka. */
  crumbs: { name: string; path: string }[];
  /** Subfolder langsung dari folder yang dibuka. */
  folders: FolderItem[];
  /** Status daftar Jelajah. loading: fe menampilkan setelah 300 ms. */
  status: 'ready' | 'loading' | 'error';
  /** Folder yang sedang terpilih di Run baru (ditandai). */
  selectedPath?: string;
  /** Masuk ke folder (klik baris, panah kanan, klik jejak, panah kiri = induk). */
  onBrowse: (path: string) => void;
  /** Pakai folder ini untuk run. */
  onPick: (path: string) => void;
  onRetry: () => void;
  onClose: () => void;
  /** Buat folder baru di folder yang dibuka (fe: POST lalu git init, lalu onPick). */
  onCreate: (name: string) => void;
  create?: { status: 'idle' | 'saving' | 'error'; message?: string };
  /** Pratinjau: kotak nama folder baru terbuka. */
  defaultCreating?: boolean;
  /** Pratinjau: isi awal kotak cari. */
  defaultQuery?: string;
}

/** Popover pilih folder (UX.md 5a): Cari, Terakhir dipakai, Jelajah dengan jejak dari folder kerja, Folder baru. */
export function FolderPopover(p: FolderPopoverProps) {
  const [query, setQuery] = useState(p.defaultQuery ?? '');
  const [creating, setCreating] = useState(p.defaultCreating ?? false);
  const [newName, setNewName] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const here = p.crumbs[p.crumbs.length - 1];
  const parent = p.crumbs.length > 1 ? p.crumbs[p.crumbs.length - 2] : null;

  const q = query.trim().toLowerCase();
  const recent = useMemo(() => p.recent.filter((f) => f.name.toLowerCase().includes(q)), [p.recent, q]);
  const folders = useMemo(() => p.folders.filter((f) => f.name.toLowerCase().includes(q)), [p.folders, q]);

  useEffect(() => { search.current?.focus(); }, []);
  useEffect(() => { if (creating) nameInput.current?.focus(); }, [creating]);
  useEffect(() => { setCreating(p.defaultCreating ?? false); setNewName(''); }, [here?.path, p.defaultCreating]);

  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-row]') ?? []);
  const move = (from: Element | null, dir: 1 | -1) => {
    const all = rows();
    const i = from ? all.indexOf(from as HTMLElement) : -1;
    const next = all[i === -1 ? (dir === 1 ? 0 : all.length - 1) : i + dir];
    if (next) next.focus(); else if (dir === -1) search.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    const row = t.closest('[data-row]');
    const inText = t.tagName === 'INPUT';
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (creating && t === nameInput.current) { setCreating(false); return; }
      p.onClose();
    } else if (e.key === 'ArrowDown' && (row || t === search.current)) { e.preventDefault(); move(row, 1); }
    else if (e.key === 'ArrowUp' && row) { e.preventDefault(); move(row, -1); }
    else if (e.key === 'ArrowRight' && row?.getAttribute('data-row') === 'browse') { e.preventDefault(); p.onBrowse(row.getAttribute('data-path')!); }
    else if (e.key === 'ArrowLeft' && parent && (!inText || query === '')) { if (row || t === search.current) { e.preventDefault(); p.onBrowse(parent.path); } }
    else if (e.key === 'Enter' && row) { e.preventDefault(); p.onPick(row.getAttribute('data-path')!); }
  };

  const submitNew = () => { const n = newName.trim(); if (n) p.onCreate(n); };
  const tag = (f: FolderItem) => (f.running ? <span className="fp-running"><span className="fp-running__dot" aria-hidden="true" />sedang jalan</span> : null);

  return (
    <div id={p.id} className="fp" role="dialog" aria-label="Pilih folder" onKeyDown={onKey}>
      <div className="fp-search">
        {Icon.search()}
        <label className="vh" htmlFor="fp-cari">Cari folder</label>
        <input
          ref={search} id="fp-cari" name="cari-folder" type="search" placeholder="Cari folder…" autoComplete="off" spellCheck={false}
          value={query} onChange={(e) => setQuery(e.target.value)}
          aria-describedby="fp-petunjuk"
        />
      </div>
      <p className="vh" id="fp-petunjuk">Panah bawah ke daftar. Enter memilih folder, panah kanan masuk, panah kiri naik satu tingkat, Esc menutup.</p>

      <div className="fp-body" ref={listRef}>
        {recent.length > 0 && (
          <section aria-labelledby="fp-recent">
            <h2 className="fp-h" id="fp-recent">Terakhir dipakai</h2>
            <ul className="fp-list">
              {recent.map((f) => (
                <li key={f.path}>
                  <button
                    type="button" className="fp-row fp-row--recent" data-row="recent" data-path={f.path}
                    aria-label={`Pakai ${f.name}${f.running ? ', sedang jalan' : ''}`}
                    onClick={() => p.onPick(f.path)}
                  >
                    <span className="fp-row__name" translate="no">{f.name}</span>
                    {f.relPath && <span className="fp-row__path mono" translate="no">{f.relPath}</span>}
                    {tag(f)}
                    {f.path === p.selectedPath && <span className="fp-row__sel">terpilih</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="fp-jelajah">
          <h2 className="fp-h" id="fp-jelajah">Jelajah</h2>
          <nav className="fp-crumbs" aria-label="Jejak folder">
            <ol>
              {p.crumbs.map((c, i) => {
                const last = i === p.crumbs.length - 1;
                return (
                  <li key={c.path}>
                    {i > 0 && <span className="trail__dot" aria-hidden="true" />}
                    {last
                      ? <span className="fp-crumb fp-crumb--here" aria-current="location" translate="no">{c.name}</span>
                      : <button type="button" className="fp-crumb" translate="no" onClick={() => p.onBrowse(c.path)}>{c.name}</button>}
                  </li>
                );
              })}
            </ol>
          </nav>

          {p.status === 'loading' && (
            <ul className="fp-list fp-list--sk" aria-busy="true" aria-label="Memuat folder">
              {[0, 1, 2, 3].map((i) => <li key={i} className="fp-sk"><span className="skel" /><span className="skel" /></li>)}
            </ul>
          )}
          {p.status === 'error' && (
            <p className="fp-msg fp-msg--bad">{Icon.alert()}<span>Folder tidak bisa dibaca.</span><button type="button" className="link-btn" onClick={p.onRetry}>Coba lagi</button></p>
          )}
          {p.status === 'ready' && p.folders.length === 0 && !creating && (
            <p className="fp-msg">Belum ada folder di sini.</p>
          )}
          {p.status === 'ready' && p.folders.length > 0 && folders.length === 0 && (
            <p className="fp-msg">Tidak ada folder bernama “{query.trim()}” di sini.</p>
          )}
          {p.status === 'ready' && folders.length > 0 && (
            <ul className="fp-list">
              {folders.map((f) => (
                <li key={f.path} className="fp-browse">
                  <button
                    type="button" className="fp-row" data-row="browse" data-path={f.path}
                    aria-label={`${f.name}${f.running ? ', sedang jalan' : ''}`}
                    aria-describedby="fp-petunjuk"
                    onClick={() => p.onBrowse(f.path)}
                  >
                    {Icon.folder()}
                    <span className="fp-row__name" translate="no">{f.name}</span>
                    {tag(f)}
                    <span className="fp-row__go">{Icon.chevronRight()}</span>
                  </button>
                  <button type="button" className="btn btn--sm fp-pick" aria-label={`Pilih ${f.name}`} onClick={() => p.onPick(f.path)}>Pilih</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="fp-foot">
        {creating ? (
          <form className="fp-new" onSubmit={(e) => { e.preventDefault(); submitNew(); }}>
            <label className="fp-new__label" htmlFor="fp-nama">Nama folder baru di {here?.name}</label>
            <input
              ref={nameInput} id="fp-nama" name="nama-folder" className="fp-new__input mono" autoComplete="off" spellCheck={false} maxLength={100}
              value={newName} onChange={(e) => setNewName(e.target.value)}
              aria-invalid={p.create?.status === 'error' || undefined}
              aria-describedby={p.create?.status === 'error' ? 'fp-nama-galat' : 'fp-nama-bantu'}
              disabled={p.create?.status === 'saving'}
            />
            {p.create?.status === 'error'
              ? <p className="fp-new__err" id="fp-nama-galat">{Icon.alert()}{p.create.message}</p>
              : <p className="fp-new__help" id="fp-nama-bantu">{p.create?.status === 'saving' ? 'Membuat folder…' : 'Enter membuat folder dan git init, Esc batal.'}</p>}
          </form>
        ) : (
          <>
            {here && (
              <button type="button" className="btn btn--sm btn--primary" onClick={() => p.onPick(here.path)}>
                Pakai <span className="fp-here" translate="no">{here.name}</span>
              </button>
            )}
            <button type="button" className="btn btn--sm" onClick={() => setCreating(true)} disabled={p.status === 'error'}>
              {Icon.plus()}Folder baru di sini
            </button>
          </>
        )}
      </div>
    </div>
  );
}
