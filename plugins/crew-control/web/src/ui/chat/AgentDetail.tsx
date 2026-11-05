import { STATUS_TEXT, StatusDot, type AgentStatus } from '../parts/StatusDot.js';
import { withSeps } from '../parts/Sep.js';

export interface AgentDetailData {
  name: string;
  /** Satu baris peran dari definisi agent. */
  role: string;
  status: AgentStatus;
  statusText?: string;
  /** Tugas saat ini (kosong bila belum jalan). */
  task?: string;
  modelDeclared: string;
  /** Model yang terpakai; kosong bila belum jalan. */
  modelUsed?: string;
  skills: string[];
  tools: string[];
  mcp: string[];
  steps: { tool: string; summary: string; time?: string }[];
  files: { path: string; change: 'baru' | 'ubah' | 'hapus' }[];
  tokens?: string;
  duration?: string;
  evidence: { label: string; note?: string }[];
}

export interface AgentDetailProps {
  /** null = belum ada agent dipilih. */
  agent: AgentDetailData | null;
}

const Chips = ({ items, mono, none }: { items: string[]; mono?: boolean; none: string }) =>
  items.length ? <ul className="chips">{items.map((s) => <li key={s} translate={mono ? 'no' : undefined} className={mono ? 'mono' : undefined}>{s}</li>)}</ul> : <p className="muted">{none}</p>;

/** Isi tab Detail: rincian satu agent. Agent yang belum jalan hanya menampilkan definisinya. */
export function AgentDetail({ agent }: AgentDetailProps) {
  if (!agent) return <div className="detail"><h3>Pilih agent</h3><p className="lead">Klik agent di kolom kiri untuk melihat tugas dan modelnya.</p></div>;
  const idle = agent.modelUsed === undefined && agent.steps.length === 0;
  const differs = agent.modelUsed !== undefined && agent.modelUsed !== agent.modelDeclared;
  return (
    <div className="detail">
      <div className="detail__head">
        <h3>{agent.name}</h3>
        <span className={`detail__st detail__st--${agent.status}`}><StatusDot status={agent.status} hideLabel /><span>{withSeps(agent.statusText ?? STATUS_TEXT[agent.status])}</span></span>
      </div>
      <p className="lead">{agent.role}</p>
      {idle && <p className="detail__idle">Belum jalan di run ini. Ini definisi agent; langkah, file, dan token muncul setelah ia mulai.</p>}

      <dl className="facts">
        {!idle && <><dt>Tugas</dt><dd>{agent.task ?? 'Tidak sedang mengerjakan item.'}</dd></>}
        <dt>Model</dt>
        <dd>
          <span>Terdeklarasi <b>{agent.modelDeclared}</b></span>
          {agent.modelUsed !== undefined && <span>Terpakai <b>{agent.modelUsed}</b>{differs && <em className="detail__diff"> beda dari definisi</em>}</span>}
        </dd>
        {!idle && agent.tokens && <><dt>Token</dt><dd className="num">{agent.tokens}</dd></>}
        {!idle && agent.duration && <><dt>Durasi</dt><dd className="num">{agent.duration}</dd></>}
      </dl>

      <section aria-labelledby="d-skill"><h4 id="d-skill">Skill</h4><Chips items={agent.skills} none="Tidak ada skill terpasang." /></section>
      <section aria-labelledby="d-alat"><h4 id="d-alat">Alat dan MCP</h4>
        <Chips items={[...agent.tools, ...agent.mcp.map((m) => `mcp:${m}`)]} mono none="Alat mengikuti bawaan." />
      </section>
      {!idle && (
        <>
          <section aria-labelledby="d-lang"><h4 id="d-lang">Langkah kerja <span className="count">{agent.steps.length}</span></h4>
            {agent.steps.length ? <ol className="steps">{agent.steps.map((s, i) => <li key={i}><b translate="no">{s.tool}</b><code translate="no">{s.summary}</code>{s.time && <span className="num">{s.time}</span>}</li>)}</ol> : <p className="muted">Belum ada langkah.</p>}
          </section>
          <section aria-labelledby="d-file"><h4 id="d-file">File berubah <span className="count">{agent.files.length}</span></h4>
            {agent.files.length ? <ul className="files">{agent.files.map((f) => <li key={f.path}><code translate="no">{f.path}</code><span>{f.change}</span></li>)}</ul> : <p className="muted">Belum ada file berubah.</p>}
          </section>
          <section aria-labelledby="d-bukti"><h4 id="d-bukti">Bukti item</h4>
            {agent.evidence.length ? <ul className="evid">{agent.evidence.map((e) => <li key={e.label}><b>{e.label}</b>{e.note && <span>{withSeps(e.note)}</span>}</li>)}</ul> : <p className="muted">Belum ada bukti untuk item ini.</p>}
          </section>
        </>
      )}
    </div>
  );
}
