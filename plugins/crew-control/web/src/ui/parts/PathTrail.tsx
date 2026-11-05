/** Jejak path sebagai deret stasiun: bulatan kecil di antara segmen, segmen terakhir tebal (konsep "peta jalur"). */
export function PathTrail({ segments, className = '' }: { segments: string[]; className?: string }) {
  return (
    <span className={`trail ${className}`} translate="no">
      {segments.map((s, i) => (
        <span key={i} className={`trail__seg${i === segments.length - 1 ? ' trail__seg--last' : ''}`}>
          {i > 0 && <span className="trail__dot" aria-hidden="true" />}
          {i > 0 && <span className="vh"> › </span>}
          <span className="trail__name">{s}</span>
        </span>
      ))}
    </span>
  );
}
