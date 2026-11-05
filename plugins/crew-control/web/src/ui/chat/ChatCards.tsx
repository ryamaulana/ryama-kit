import { useState, type ReactNode } from 'react';
import { Mark } from '../parts/Mark.js';
import { Icon } from '../parts/icons.js';
import { Sep, withSeps } from '../parts/Sep.js';

/** Kartu yang sudah dijawab menciut jadi satu baris (UX 5b). tone memberi bentuk selain warna: centang, silang, garis. */
export interface Resolved { text: string; tone?: 'ok' | 'no' | 'cancel' }

export function ResolvedLine({ resolved }: { resolved: Resolved }) {
  const t = resolved.tone ?? 'ok';
  return (
    <div className={`resolved resolved--${t}`}>
      <span className="resolved__icon" aria-hidden="true">{t === 'ok' ? <Icon.check /> : t === 'no' ? <Icon.close /> : <span className="resolved__dash" />}</span>
      <span>{withSeps(resolved.text)}</span>
    </div>
  );
}

function Kicker({ label, from }: { label: string; from: string }) {
  return <p className="card__k"><Mark kind="ask" small />{label}<span className="vh">, </span><span className="card__from">dari {from}</span></p>;
}

/* ---------- Pesan biasa ---------- */
export function UserMessage({ text, pending }: { text: string; pending?: string }) {
  return (
    <div className="msg-me">
      <p>{text}</p>
      {pending && <span className="msg-me__pending">{pending}</span>}
    </div>
  );
}

export function AgentMessage({ from, time, children }: { from: string; time?: string; children: ReactNode }) {
  return (
    <div className="msg-agent">
      <div className="msg-agent__from"><b>{from}</b>{time && <><Sep />{time}</>}</div>
      <div className="msg-agent__body">{children}</div>
    </div>
  );
}

export interface ToolStep { agent: string; tool: string; summary: string }
export function ToolSteps({ steps }: { steps: ToolStep[] }) {
  const names = [...new Set(steps.map((s) => s.tool))].join(', ');
  return (
    <details className="tools">
      <summary><Icon.chevronRight />{steps.length} langkah<Sep />{names}</summary>
      <ul>{steps.map((s, i) => <li key={i}><b>{s.agent}</b><code translate="no">{s.tool} {s.summary}</code></li>)}</ul>
    </details>
  );
}

/* ---------- Pesan sistem ---------- */
export interface SystemLineProps {
  variant: 'info' | 'batch' | 'limit' | 'bad' | 'rule';
  text: string;
  /** Rincian yang bisa dibuka (batch: item, commit, token, durasi) atau alasan gagal. */
  detail?: { label: string; value: string }[];
  action?: { label: string; onClick: () => void };
}
export function SystemLine({ variant, text, detail, action }: SystemLineProps) {
  const act = action && <button type="button" className={variant === 'bad' ? 'btn btn--sm' : 'link-btn'} onClick={action.onClick}>{action.label}</button>;
  if (variant === 'bad') {
    return (
      <div className="sys-bad" role="alert">
        <span className="sys-bad__icon" aria-hidden="true"><Mark kind="bad" small /></span>
        <div>
          <p className="sys-bad__t">{withSeps(text)}</p>
          {detail && <dl className="kv">{detail.map((d) => <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl>}
          {act}
        </div>
      </div>
    );
  }
  const body = (
    <>
      <i className={`sys__dot sys__dot--${variant}`} aria-hidden="true" />
      <span>{withSeps(text)}</span>
    </>
  );
  if (variant === 'batch' && detail) {
    return (
      <details className="sys sys--open">
        <summary>{body}<Icon.chevronDown /></summary>
        <dl className="kv">{detail.map((d) => <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl>
      </details>
    );
  }
  return <div className="sys">{body}{act}</div>;
}

/* ---------- Pertanyaan ---------- */
export interface QuestionOption { label: string; description?: string }
export interface QuestionItem { id: string; text: string; multi?: boolean; options: QuestionOption[] }
export interface QuestionCardProps {
  from: string;
  questions: QuestionItem[];
  resolved?: Resolved;
  /** jawaban: id pertanyaan -> pilihan (label, atau teks "Lainnya") */
  onSubmit: (answers: Record<string, string[]>) => void;
  /** Untuk pratinjau: buka kotak "Lainnya" sejak awal. */
  defaultOther?: boolean;
}
export function QuestionCard({ from, questions, resolved, onSubmit, defaultOther = false }: QuestionCardProps) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [otherOpen, setOtherOpen] = useState<Record<string, boolean>>(defaultOther ? { [questions[0]?.id ?? '']: true } : {});
  if (resolved) return <ResolvedLine resolved={resolved} />;
  const quick = questions.length === 1 && !questions[0].multi;
  const toggle = (q: QuestionItem, label: string) => {
    if (quick) { onSubmit({ [q.id]: [label] }); return; }
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      return { ...p, [q.id]: q.multi ? (cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]) : [label] };
    });
    if (!q.multi) setOtherOpen((o) => ({ ...o, [q.id]: false }));
  };
  const answerOf = (q: QuestionItem) => [...(picked[q.id] ?? []), ...(otherOpen[q.id] && other[q.id]?.trim() ? [other[q.id].trim()] : [])];
  const ready = questions.every((q) => answerOf(q).length > 0);
  const send = () => { if (ready) onSubmit(Object.fromEntries(questions.map((q) => [q.id, answerOf(q)]))); };
  return (
    <section className="card" data-pending="" aria-label={`Pertanyaan dari ${from}`}>
      <Kicker label="Pertanyaan" from={from} />
      {questions.map((q) => {
        const hid = `q-${q.id}`;
        return (
          <div key={q.id} className="card__group" role="group" aria-labelledby={hid}>
            <h3 id={hid}>{q.text}</h3>
            {q.multi && <p className="card__hint card__hint--top">Pilih satu atau lebih.</p>}
            <div className="opts">
              {q.options.map((o) => {
                const on = (picked[q.id] ?? []).includes(o.label);
                return (
                  <button key={o.label} type="button" className="opt" aria-pressed={quick ? undefined : on} onClick={() => toggle(q, o.label)}>
                    <span className="opt__t">{o.label}{on && <Icon.check />}</span>
                    {o.description && <span className="opt__d">{o.description}</span>}
                  </button>
                );
              })}
              <button type="button" className="opt opt--other" aria-expanded={!!otherOpen[q.id]}
                onClick={() => setOtherOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}>
                <span className="opt__t">Lainnya{'…'}</span>
              </button>
            </div>
            {otherOpen[q.id] && (
              <div className="other">
                <label className="vh" htmlFor={`o-${q.id}`}>Jawaban lain untuk: {q.text}</label>
                <input id={`o-${q.id}`} className="field" type="text" autoComplete="off" autoFocus placeholder="Ketik jawabanmu sendiri"
                  value={other[q.id] ?? ''} onChange={(e) => setOther((o) => ({ ...o, [q.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && (other[q.id] ?? '').trim()) { e.preventDefault(); if (quick) onSubmit({ [q.id]: [other[q.id].trim()] }); else send(); } }} />
                {quick && <button type="button" className="btn btn--primary btn--sm" disabled={!(other[q.id] ?? '').trim()} onClick={() => onSubmit({ [q.id]: [other[q.id].trim()] })}>Kirim jawaban</button>}
              </div>
            )}
          </div>
        );
      })}
      {quick ? <p className="card__hint">Pilih satu untuk langsung mengirim jawaban.</p> : (
        <div className="card__foot">
          <button type="button" className="btn btn--primary" aria-disabled={!ready} onClick={send}>Kirim jawaban</button>
          {!ready && <span className="card__hint">Jawab semua pertanyaan dulu.</span>}
        </div>
      )}
    </section>
  );
}

/* ---------- Izin ---------- */
export interface PermissionCardProps {
  from: string;
  tool: string;
  /** Perintah atau path apa adanya (monospasi). */
  command: string;
  /** Alasan ditanya (tool.why). */
  why: string;
  /** Pola aturan bila "Selalu setujui", mis. "Write di folder proyek". */
  alwaysRule?: string;
  resolved?: Resolved;
  onAllow: () => void;
  onDeny: (reason?: string) => void;
  onAlways: () => void;
  /** Pratinjau: kotak alasan terbuka sejak awal. */
  defaultRejecting?: boolean;
}
export function PermissionCard({ from, tool, command, why, alwaysRule, resolved, onAllow, onDeny, onAlways, defaultRejecting = false }: PermissionCardProps) {
  const [rejecting, setRejecting] = useState(defaultRejecting);
  const [reason, setReason] = useState('');
  if (resolved) return <ResolvedLine resolved={resolved} />;
  return (
    <section className="card" data-pending="" aria-label={`Izin ${tool} dari ${from}`}>
      <Kicker label="Izin" from={from} />
      <h3>Izinkan {tool}?</h3>
      <pre className="cmd" translate="no"><code>{command}</code></pre>
      <p className="card__why"><span>Kenapa ditanya</span>{why}</p>
      {rejecting ? (
        <div className="reject">
          <label htmlFor="rj" className="reject__l">Alasan penolakan (boleh kosong)</label>
          <input id="rj" className="field" type="text" autoComplete="off" autoFocus placeholder="Mis. jangan menulis di luar proyek"
            value={reason} onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); onDeny(reason.trim() || undefined); } if (e.key === 'Escape') setRejecting(false); }} />
          <div className="card__foot">
            <button type="button" className="btn" onClick={() => onDeny(reason.trim() || undefined)}>Kirim penolakan</button>
            <button type="button" className="link-btn" onClick={() => setRejecting(false)}>Batal</button>
          </div>
        </div>
      ) : (
        <div className="card__foot card__foot--wrap">
          <button type="button" className="btn btn--primary" onClick={onAllow}>Setujui</button>
          <button type="button" className="btn" onClick={() => setRejecting(true)}>Tolak</button>
          <button type="button" className="link-btn" onClick={onAlways}>Selalu setujui</button>
        </div>
      )}
      {!rejecting && alwaysRule && <p className="card__hint">Selalu setujui berlaku untuk proyek ini: {alwaysRule}</p>}
    </section>
  );
}

/* ---------- Usulan milestone (F3) ---------- */
export interface MilestoneCardProps {
  from: string;
  name: string;
  items: string[];
  resolved?: Resolved;
  onApprove: () => void;
  /** Mengisi kotak ketik dengan "Ubah milestone: ". */
  onEdit: () => void;
}
const FOLD_AFTER = 5;
export function MilestoneCard({ from, name, items, resolved, onApprove, onEdit }: MilestoneCardProps) {
  if (resolved) return <ResolvedLine resolved={resolved} />;
  const head = items.slice(0, FOLD_AFTER), rest = items.slice(FOLD_AFTER);
  return (
    <section className="card" data-pending="" aria-label={`Usulan milestone ${name}`}>
      <Kicker label="Usulan milestone" from={from} />
      <h3>{name} <span className="card__count">{items.length} item</span></h3>
      <ol className="mlist">{head.map((t, i) => <li key={i}>{t}</li>)}</ol>
      {rest.length > 0 && (
        <details className="mfold">
          <summary>{rest.length} item lainnya<Icon.chevronDown /></summary>
          <ol className="mlist" start={FOLD_AFTER + 1}>{rest.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </details>
      )}
      <div className="card__foot"><button type="button" className="btn btn--primary" onClick={onApprove}>Setujui</button><button type="button" className="btn" onClick={onEdit}>Ubah</button></div>
    </section>
  );
}

/* ---------- Keputusan checkpoint backlog ---------- */
export interface DecisionCardProps {
  from: string;
  question: string;
  context?: string;
  resolved?: Resolved;
  onSubmit: (answer: string) => void;
}
export function DecisionCard({ from, question, context, resolved, onSubmit }: DecisionCardProps) {
  const [v, setV] = useState('');
  if (resolved) return <ResolvedLine resolved={resolved} />;
  return (
    <section className="card" data-pending="" aria-label={`Keputusan dari ${from}`}>
      <Kicker label="Keputusan" from={from} />
      <h3 id="dc-q">{question}</h3>
      {context && <p className="card__ctx">{context}</p>}
      <label className="reject__l" htmlFor="dc-a">Jawabanmu</label>
      <textarea id="dc-a" className="field field--area" rows={3} maxLength={2000} value={v} onChange={(e) => setV(e.target.value)} />
      <div className="card__foot"><button type="button" className="btn btn--primary" aria-disabled={!v.trim()} onClick={() => v.trim() && onSubmit(v.trim())}>Kirim jawaban</button><span className="card__hint">Dipakai sebelum batch berikutnya.</span></div>
    </section>
  );
}
