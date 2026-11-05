import type { KeyboardEvent } from 'react';

/** run: Jalan · paused: Dijeda · done: Selesai (melanjutkan sesi) · desktop: sesi desktop · stopped: Dihentikan */
export type ComposerMode = 'run' | 'paused' | 'done' | 'desktop' | 'stopped';

export interface ComposerProps {
  mode: ComposerMode;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  /** Nama penerima di label. Bawaan "orkestrator". */
  to?: string;
  sending?: boolean;
  onNewRun?: () => void;
}

const NOTE: Partial<Record<ComposerMode, string>> = {
  run: 'Pesan masuk setelah langkah yang sedang jalan selesai.',
  paused: 'Run dijeda. Pesan terkirim saat kamu menekan Lanjut.',
  done: 'Run selesai. Mengetik melanjutkan sesi yang sama.',
};

export function Composer({ mode, value, onChange, onSend, to = 'orkestrator', sending = false, onNewRun }: ComposerProps) {
  if (mode === 'desktop') return <div className="compose compose--note"><p>Sesi dari aplikasi desktop tidak bisa dikirimi pesan dari sini.</p></div>;
  if (mode === 'stopped') {
    return (
      <div className="compose compose--note">
        <p>Run dihentikan. Mulai run baru untuk lanjut.</p>
        <button type="button" className="btn btn--primary" onClick={onNewRun}>Run baru</button>
      </div>
    );
  }
  const empty = !value.trim();
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!empty && !sending) onSend(); }
  };
  return (
    <div className="compose">
      <p className="compose__note">{NOTE[mode]}</p>
      <div className={`box${empty ? ' box--empty' : ''}`}>
        <label className="vh" htmlFor="msg">Pesan ke {to}</label>
        <textarea id="msg" rows={2} autoComplete="off" placeholder={`Tulis ke ${to}`} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={key} />
        <button type="button" className="btn btn--primary" aria-busy={sending || undefined} aria-disabled={empty || sending} onClick={() => !empty && !sending && onSend()}>{sending ? 'Mengirim' : 'Kirim pesan'}</button>
      </div>
    </div>
  );
}
