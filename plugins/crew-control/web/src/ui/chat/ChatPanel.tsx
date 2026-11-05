import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import {
  AgentMessage, DecisionCard, MilestoneCard, PermissionCard, QuestionCard, SystemLine, ToolSteps, UserMessage,
  type DecisionCardProps, type MilestoneCardProps, type PermissionCardProps, type QuestionCardProps, type SystemLineProps, type ToolStep,
} from './ChatCards.js';
import { Composer, type ComposerProps } from './Composer.js';
import { Icon } from '../parts/icons.js';
import './chat.css';

type Strip<T, K extends string> = Omit<T, K>;
export type ChatItem =
  | { kind: 'user'; id: string; text: string; pending?: string }
  | { kind: 'agent'; id: string; from: string; time?: string; body: ReactNode }
  | { kind: 'tools'; id: string; steps: ToolStep[] }
  | ({ kind: 'system'; id: string } & SystemLineProps)
  | ({ kind: 'question'; id: string } & Strip<QuestionCardProps, 'onSubmit'>)
  | ({ kind: 'permission'; id: string } & Strip<PermissionCardProps, 'onAllow' | 'onDeny' | 'onAlways'>)
  | ({ kind: 'milestone'; id: string } & Strip<MilestoneCardProps, 'onApprove' | 'onEdit'>)
  | ({ kind: 'decision'; id: string } & Strip<DecisionCardProps, 'onSubmit'>);

/** Aksi dari kartu; fe menyambung ke API dengan id pesan. */
export interface ChatActions {
  answerQuestion: (id: string, answers: Record<string, string[]>) => void;
  allow: (id: string) => void;
  deny: (id: string, reason?: string) => void;
  always: (id: string) => void;
  approveMilestone: (id: string) => void;
  editMilestone: (id: string) => void;
  answerDecision: (id: string, answer: string) => void;
}

export type SideTab = 'chat' | 'detail';

export interface ChatPanelProps {
  tab: SideTab;
  onTabChange: (t: SideTab) => void;
  items: ChatItem[];
  actions: ChatActions;
  composer: ComposerProps;
  /** Isi tab Detail (AgentDetail). */
  detail: ReactNode;
  /** Jumlah kartu belum dijawab; lencana di tab Chat saat tab Detail terbuka. */
  waiting?: number;
  /** Teks banner "Baca saja" (run lama): kotak ketik disembunyikan. */
  readOnly?: string;
  /** Pratinjau: tidak menggulir otomatis ke bawah. */
  loading?: boolean;
}

function Item({ it, a }: { it: ChatItem; a: ChatActions }) {
  switch (it.kind) {
    case 'user': return <UserMessage text={it.text} pending={it.pending} />;
    case 'agent': return <AgentMessage from={it.from} time={it.time}>{it.body}</AgentMessage>;
    case 'tools': return <ToolSteps steps={it.steps} />;
    case 'system': return <SystemLine {...it} />;
    case 'question': return <QuestionCard {...it} onSubmit={(x) => a.answerQuestion(it.id, x)} />;
    case 'permission': return <PermissionCard {...it} onAllow={() => a.allow(it.id)} onDeny={(r) => a.deny(it.id, r)} onAlways={() => a.always(it.id)} />;
    case 'milestone': return <MilestoneCard {...it} onApprove={() => a.approveMilestone(it.id)} onEdit={() => a.editMilestone(it.id)} />;
    case 'decision': return <DecisionCard {...it} onSubmit={(x) => a.answerDecision(it.id, x)} />;
  }
}

export function ChatPanel({ tab, onTabChange, items, actions, composer, detail, waiting = 0, readOnly, loading }: ChatPanelProps) {
  const log = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(0);
  const [unseen, setUnseen] = useState(false);
  const nearBottom = useRef(true);
  const lastCount = useRef(items.length);

  const measure = useCallback(() => {
    const el = log.current; if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom.current) setUnseen(false);
    const box = el.getBoundingClientRect();
    let out = 0;
    el.querySelectorAll('[data-pending]').forEach((n) => { const r = n.getBoundingClientRect(); if (r.bottom < box.top + 8 || r.top > box.bottom - 8) out += 1; });
    setOffscreen(out);
  }, []);

  useLayoutEffect(() => {
    const el = log.current; if (!el || loading) return;
    if (items.length !== lastCount.current && !nearBottom.current) setUnseen(true);
    else if (nearBottom.current) el.scrollTop = el.scrollHeight;
    lastCount.current = items.length;
    measure();
  }, [items, loading, measure, tab]);
  useEffect(() => { measure(); }, [tab, measure]);

  const jump = () => { log.current?.querySelector('[data-pending]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  const tabKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); onTabChange(tab === 'chat' ? 'detail' : 'chat'); }
  };

  return (
    <div className="chatp">
      <div className="tabs" role="tablist" aria-label="Chat dan detail agent" onKeyDown={tabKey}>
        <button type="button" role="tab" id="tab-chat" aria-selected={tab === 'chat'} aria-controls="panel-chat" tabIndex={tab === 'chat' ? 0 : -1} className="tab" onClick={() => onTabChange('chat')}>
          Chat{tab === 'detail' && waiting > 0 && <span className="tab__badge">{waiting}<span className="vh"> menunggu kamu</span></span>}
        </button>
        <button type="button" role="tab" id="tab-detail" aria-selected={tab === 'detail'} aria-controls="panel-detail" tabIndex={tab === 'detail' ? 0 : -1} className="tab" onClick={() => onTabChange('detail')}>Detail</button>
      </div>

      {readOnly && <p className="readonly" role="note"><Icon.alert /><span><b>Baca saja.</b> {readOnly}</span></p>}

      <div className="panel" id="panel-chat" role="tabpanel" aria-labelledby="tab-chat" hidden={tab !== 'chat'}>
        <h2 className="vh">Chat</h2>
        <div className="chat" ref={log} role="log" aria-live="polite" tabIndex={-1} onScroll={measure}>
          {items.map((it) => <Item key={it.id} it={it} a={actions} />)}
        </div>
        {tab === 'chat' && (offscreen > 0 || unseen) && (
          <div className="markers">
            {offscreen > 0 && <button type="button" className="marker marker--ask" onClick={jump}>{offscreen} menunggu kamu <span aria-hidden="true">↓</span></button>}
            {unseen && offscreen === 0 && <button type="button" className="marker" onClick={() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }}>Pesan baru <span aria-hidden="true">↓</span></button>}
          </div>
        )}
      </div>
      <div className="panel" id="panel-detail" role="tabpanel" aria-labelledby="tab-detail" hidden={tab !== 'detail'}>{detail}</div>

      {!readOnly && <Composer {...composer} />}
    </div>
  );
}
