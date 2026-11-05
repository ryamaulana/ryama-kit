export interface PipsProps { total: number; done: number; now?: number; bad?: number }

/** Deret milestone: satu titik satu item (selesai tinta, dikerjakan biru, gagal merah, sisa garis). */
export function Pips({ total, done, now = 0, bad = 0 }: PipsProps) {
  const rest = Math.max(0, total - done - now - bad);
  const parts = [`${done} selesai`];
  if (now) parts.push(`${now} dikerjakan`);
  if (bad) parts.push(`${bad} gagal`);
  parts.push(`${rest} sisa`);
  return (
    <ol className={`pips${total < 24 ? ' pips--short' : ''}`} aria-label={`Item milestone: ${parts.join(', ')} dari ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <li key={i} className={i < done ? 'pips__d' : i < done + now ? 'pips__n' : i < done + now + bad ? 'pips__x' : undefined} />
      ))}
    </ol>
  );
}
