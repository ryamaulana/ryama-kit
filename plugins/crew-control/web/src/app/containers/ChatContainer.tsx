import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import type { Message, MessageV2, ToolEvent } from '../../../../src/contract/messages.js';
import type { Run } from '../../../../src/contract/runs.js';
import { ChatPanel, type ChatActions, type SideTab } from '../../ui/chat/ChatPanel.js';
import { api, ApiError } from '../api.js';
import { answerFailure, canContinue, composerMode, panelItems, permissionAnswer, questionAnswer, runNotice } from '../lib/answers.js';

const NOOP = () => {};
// Kartu milestone, keputusan: item bk06.
const ACTIONS_REST = { approveMilestone: NOOP, editMilestone: NOOP, answerDecision: NOOP };

interface Props {
  run: Run; messages: (Message | MessageV2)[]; tools: ToolEvent[];
  /** id run terakhir proyek; beda dengan run ini = Baca saja. */
  latestRunId: string | null; projectId: string; limitResetAt: string | null;
  tab: SideTab; onTabChange: (t: SideTab) => void; waiting: number; detail: ReactNode;
}

/** Chat layar proyek: jawab kartu pertanyaan, kotak ketik (draf per run), banner Baca saja. UX 5b. */
export function ChatContainer({ run, messages, tools, latestRunId, projectId, limitResetAt, tab, onTabChange, waiting, detail }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const byId = useRef(new Map<string, Message | MessageV2>());
  byId.current = new Map(messages.map((m) => [m.id, m]));
  const draft = drafts[run.id] ?? '';
  const readOnly = !!latestRunId && latestRunId !== run.id;

  const answer = useMutation({
    mutationFn: (v: { id: string; body: unknown }) => api('POST', `/api/runs/${run.id}/messages/${v.id}/answer`, v.body),
    onMutate: () => setError(null),
    onError: (e: ApiError, v) => {
      const f = answerFailure(e);
      if (f.resolved) setConflicts((c) => new Set(c).add(v.id)); else setError(f.text);
    },
  });
  const [undone, setUndone] = useState<ReadonlySet<string>>(new Set());
  const undo = useMutation({
    mutationFn: (ruleId: string) => api('DELETE', `/api/projects/${projectId}/rules/${ruleId}`),
    onMutate: () => setError(null),
    onSuccess: (_d, ruleId) => setUndone((u) => new Set(u).add(ruleId)),
    onError: (e: ApiError) => setError(e.message),
  });
  const resume = useMutation({
    mutationFn: () => api('POST', `/api/runs/${run.id}/continue`, {}),
    onMutate: () => setError(null),
    onError: (e: ApiError) => setError(e.message),
  });
  const decide = (id: string, decision: 'allow' | 'deny' | 'always', reason?: string) => answer.mutate({ id, body: permissionAnswer(decision, reason) });
  const send = useMutation({
    mutationFn: (text: string) => api('POST', `/api/runs/${run.id}/messages`, { text }),
    onMutate: () => setError(null),
    // Teks dikosongkan hanya setelah server menerima; ditolak = teks tetap di kotak.
    onSuccess: () => setDrafts((d) => ({ ...d, [run.id]: '' })),
    onError: (e: ApiError) => setError(e.message),
  });

  const actions: ChatActions = {
    ...ACTIONS_REST,
    allow: (id) => decide(id, 'allow'), deny: (id, r) => decide(id, 'deny', r), always: (id) => decide(id, 'always'),
    answerQuestion: (id, byIndex) => { const m = byId.current.get(id); if (m) answer.mutate({ id, body: questionAnswer(m, byIndex) }); },
  };
  const notice = runNotice(run, limitResetAt);
  const items = [...panelItems(messages, tools, conflicts), ...(notice ? [notice] : [])].map((it) => {
    if (it.kind !== 'system') return it;
    const { ruleId, continueRun, ...rest } = it;
    if (ruleId && !undone.has(ruleId)) return { ...rest, action: { label: 'Batalkan', onClick: () => undo.mutate(ruleId) } };
    if (continueRun && canContinue(run, !readOnly)) return { ...rest, action: { label: 'Lanjutkan', onClick: () => resume.mutate() } };
    return rest;
  });
  const mode = composerMode(run.status, run.sessionId, (run as { origin?: string }).origin);

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <ChatPanel
        tab={tab} onTabChange={onTabChange} items={items} waiting={waiting} actions={actions} detail={detail}
        readOnly={readOnly ? 'Ini run lama, tidak bisa dikirimi pesan.' : undefined}
        composer={{
          mode, value: draft, sending: send.isPending,
          onChange: (v) => setDrafts((d) => ({ ...d, [run.id]: v })),
          onSend: () => send.mutate(draft.trim()),
        }}
      />
      {readOnly && <Link to={`/proyek/${projectId}`}>Buka run terakhir</Link>}
    </>
  );
}
