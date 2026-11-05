import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { Config } from '../../../../src/contract/runs.js';
import type { RunV2 } from '../../../../src/contract/runs.js';
import type { z } from 'zod';
import { NewRunView, type NewRunNotice } from '../../ui/screens/NewRunView.js';
import { PageHead } from '../../ui/screens/AppShell.js';
import type { FolderItem } from '../../ui/screens/FolderPopover.js';
import { api, ApiError } from '../api.js';
import {
  DRAFT_KEY, FOLDER_RESET_MSG, MAX_PROMPT, PREFS_KEY, parseDraft, parsePrefs, pickCommand, pickId, rememberRun, startNotice, validatePrompt,
} from '../lib/newRun.js';

type Cfg = z.infer<typeof Config>;
interface Listing {
  path: string; name: string; parent: string | null; isRoot: boolean;
  folders: { name: string; path: string; activeRunId: string | null }[];
  project: { id: string; lastCommandId: string | null; hasOpenBacklog: boolean; activeRunId: string | null } | null;
}

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* mode privat: tidak diingat */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* idem */ } },
};
const listingUrl = (p?: string) => `/api/folders${p ? `?path=${encodeURIComponent(p)}` : ''}`;

/** Run baru (/baru): bawaan dari localStorage, Enter memulai, pindah ke /proyek/<id>. UX.md 5a, ARCHITECTURE 7.A. */
export function NewRunContainer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cfgQ = useQuery({ queryKey: ['config'], queryFn: () => api<Cfg>('GET', '/api/config') });
  const cfg = cfgQ.data;
  const prefs = useRef(parsePrefs(store.get(PREFS_KEY)));

  const [init, setInit] = useState<{ listing: Listing; message?: string } | null>(null);
  const [folder, setFolder] = useState('');
  const [project, setProject] = useState<Listing['project']>(null);
  const [browse, setBrowse] = useState('');
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => parseDraft(store.get(DRAFT_KEY)));
  const [commandId, setCommandId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [modelId, setModelId] = useState('');
  const [notice, setNotice] = useState<NewRunNotice | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [create, setCreate] = useState<{ status: 'idle' | 'saving' | 'error'; message?: string }>({ status: 'idle' });

  const teams = useMemo(() => (cfg?.teams ?? []).filter((t) => t.valid), [cfg]);
  const team = teams.find((t) => t.id === teamId);

  // Bawaan: folder dari ?folder= (Layar proyek) atau yang terakhir; tidak sah -> folder kerja + satu baris pesan.
  useEffect(() => {
    if (!cfg || init) return;
    const wanted = params.get('folder') ?? prefs.current.folder;
    (async () => {
      let message: string | undefined;
      let listing: Listing | null = null;
      if (wanted) {
        try { listing = await api<Listing>('GET', listingUrl(wanted)); } catch (e) {
          if (!(e instanceof ApiError) || e.status === 0) { setNotice({ kind: 'failed', message: (e as Error).message }); return; }
          message = FOLDER_RESET_MSG;
        }
      }
      if (!listing) {
        try { listing = await api<Listing>('GET', listingUrl()); } catch (e) { setNotice({ kind: 'failed', message: (e as Error).message }); return; }
      }
      setInit({ listing, message });
    })();
  }, [cfg, init, params]);

  const cmdsOf = (tid: string) => teams.find((t) => t.id === tid)?.commands ?? [];
  const chooseCommand = (tid: string, p: Listing['project'], folderPath: string) =>
    pickCommand(cmdsOf(tid), prefs.current.cmds[folderPath] ?? p?.lastCommandId, !!p?.hasOpenBacklog);

  useEffect(() => {
    if (!cfg || !init) return;
    const tid = pickId(prefs.current.team, teams.map((t) => t.id));
    setTeamId(tid);
    setModelId(pickId(prefs.current.model, cfg.models.map((m) => m.id), cfg.defaultModel));
    setFolder(init.listing.path); setBrowse(init.listing.path); setProject(init.listing.project);
    setCommandId(chooseCommand(tid, init.listing.project, init.listing.path));
    if (init.message) setNotice({ kind: 'failed', message: init.message });
  }, [cfg, init]); // eslint-disable-line react-hooks/exhaustive-deps

  const browseQ = useQuery({ queryKey: ['folders', browse], queryFn: () => api<Listing>('GET', listingUrl(browse)), enabled: !!browse && open });

  const setDraft = (t: string) => {
    const v = t.slice(0, MAX_PROMPT);
    setText(v); if (v) store.set(DRAFT_KEY, v); else store.del(DRAFT_KEY);
    if (notice?.kind === 'needs-text') setNotice(null);
  };

  const pick = useCallback(async (path: string) => {
    setOpen(false); setFolderError(null); setNotice(null); setFolder(path);
    try {
      const l = await api<Listing>('GET', listingUrl(path));
      setProject(l.project); setCommandId(chooseCommand(teamId, l.project, path));
    } catch { setProject(null); }
  }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cfgQ.isError || (!init && notice?.kind === 'failed')) {
    return (
      <>
        <PageHead title="Run baru" />
        <p role="alert">{cfgQ.isError ? (cfgQ.error as Error).message : notice?.message}</p>
        <button type="button" onClick={() => { setNotice(null); cfgQ.refetch(); }}>Coba lagi</button>
      </>
    );
  }
  if (!cfg || !init || !team) return <><PageHead title="Run baru" /><p role="status">Memuat…</p></>;

  const root = cfg.workRoot;
  const rootName = root.split('/').filter(Boolean).pop() ?? root;
  const rel = (p: string) => p.slice(root.length).split('/').filter(Boolean);
  const item = (p: string): FolderItem => ({ name: rel(p).pop() ?? rootName, path: p, relPath: rel(p).join(' › ') });
  const command = team.commands.find((c) => c.id === commandId);
  const bl = browseQ.data;
  const crumbPath = bl?.path ?? browse;

  const submit = async () => {
    if (submitting || !command) return;
    const bad = validatePrompt(text, command.needsText);
    if (bad) { setNotice({ kind: 'needs-text', message: bad }); return; }
    setSubmitting(true); setNotice(null); setFolderError(null);
    try {
      const run = await api<RunV2>('POST', '/api/runs', { project: folder, teamId, commandId, prompt: text.trim(), model: modelId });
      store.set(PREFS_KEY, JSON.stringify(rememberRun(prefs.current, { folder, model: modelId, team: teamId, commandId })));
      store.del(DRAFT_KEY);
      navigate(`/proyek/${run.projectId}`);
    } catch (e) {
      // Teks dan isian tetap: hanya notice yang berubah.
      const n = startNotice(e instanceof ApiError ? e : { status: 0, code: 'network', message: (e as Error).message }, { activeRunId: project?.activeRunId });
      if (n.folderGone) {
        setFolderError(n.message);
        setBrowse(folder.slice(0, folder.lastIndexOf('/')).length >= root.length ? folder.slice(0, folder.lastIndexOf('/')) : root);
        setOpen(true);
      } else {
        setNotice({
          kind: n.kind, message: n.message,
          action: n.action && { label: n.action.label, href: n.action.href },
        });
      }
      setSubmitting(false);
    }
  };

  return (
    <NewRunView
      workRoot={root}
      commands={team.commands.map((c) => ({ id: c.id, label: c.label, placeholder: c.placeholder }))}
      commandId={commandId}
      onCommandChange={(id) => { setCommandId(id); setNotice(null); }}
      text={text}
      onTextChange={setDraft}
      maxLength={MAX_PROMPT}
      folder={{ segments: [rootName, ...rel(folder)], isWorkRoot: folder === root }}
      folderError={folderError}
      folderOpen={open}
      onFolderOpenChange={(o) => { setOpen(o); if (o) setBrowse(folder); }}
      folderPicker={{
        recent: prefs.current.recent.filter((p) => p.startsWith(root)).map(item),
        crumbs: [{ name: rootName, path: root }, ...rel(crumbPath).map((name, i, a) => ({ name, path: `${root}/${a.slice(0, i + 1).join('/')}` }))],
        folders: (bl?.folders ?? []).map((f) => ({ name: f.name, path: f.path, running: !!f.activeRunId })),
        status: browseQ.isError ? 'error' : browseQ.isPending ? 'loading' : 'ready',
        selectedPath: folder,
        onBrowse: setBrowse,
        onPick: pick,
        onRetry: () => { browseQ.refetch(); },
        create,
        onCreate: async (name) => {
          setCreate({ status: 'saving' });
          try {
            const l = await api<Listing>('POST', '/api/folders', { parent: crumbPath, name });
            setCreate({ status: 'idle' }); pick(l.path);
          } catch (e) { setCreate({ status: 'error', message: (e as Error).message }); }
        },
      }}
      teams={teams.map((t) => ({ id: t.id, label: t.name }))}
      teamId={teamId}
      onTeamChange={(id) => { setTeamId(id); setCommandId(chooseCommand(id, project, folder)); }}
      models={cfg.models}
      modelId={modelId}
      onModelChange={setModelId}
      submitting={submitting}
      notice={notice}
      onSubmit={submit}
      onNavigate={(href, e) => { e.preventDefault(); navigate(href); }}
    />
  );
}
