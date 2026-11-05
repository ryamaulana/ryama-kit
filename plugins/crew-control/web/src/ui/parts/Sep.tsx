import { Fragment, type ReactNode } from 'react';

/** Pemisah: bulatan 4 px menggantikan "·" (DESIGN.md, Pelanggaran disengaja). */
export const Sep = () => <span className="sep" aria-hidden="true" />;

/** Teks berpemisah " · " dirender dengan Sep; pembaca layar mendengar koma. */
export function withSeps(text: string): ReactNode {
  const parts = text.split(' · ');
  if (parts.length === 1) return text;
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <><span className="vh">, </span><Sep /></>}
      {p}
    </Fragment>
  ));
}
