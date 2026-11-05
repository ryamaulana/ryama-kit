export type Theme = 'system' | 'light' | 'dark';
export const THEME_KEY = 'crew.theme';

/** Nilai tersimpan yang tidak dikenal (atau tidak ada = kunjungan pertama) jatuh ke "ikut sistem". */
export function parseTheme(raw: string | null | undefined): Theme {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/** "system" = tanpa atribut, sehingga prefers-color-scheme di tokens.css yang menentukan. */
export function applyTheme(root: { setAttribute(k: string, v: string): void; removeAttribute(k: string): void }, theme: Theme) {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
