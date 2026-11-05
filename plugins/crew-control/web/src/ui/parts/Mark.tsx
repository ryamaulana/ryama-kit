export type MarkKind = 'ask' | 'review' | 'bad' | 'run' | 'limit' | 'done' | 'stopped' | 'ready' | 'skip';

/** Simbol stasiun 16 px (atau 12 px dengan small). Selalu dekoratif: status tertulis sebagai teks di sebelahnya. */
export function Mark({ kind, small = false }: { kind: MarkKind; small?: boolean }) {
  return (
    <span className={`mark mark--${kind}${small ? ' mark--sm' : ''}`} aria-hidden="true">
      {kind === 'bad' && (
        <svg viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" /></svg>
      )}
      {kind === 'skip' && (
        <svg viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M2 4h4" /></svg>
      )}
      {kind === 'done' && (
        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.2l2 2 4-4.4" /></svg>
      )}
    </span>
  );
}
