import { useCallback, useEffect, useState } from 'react';
import { applyTheme, parseTheme, THEME_KEY, type Theme } from '../lib/theme.js';

const read = () => { try { return parseTheme(localStorage.getItem(THEME_KEY)); } catch { return 'system' as Theme; } };

/** Pengaturan sisi klien (tema). Pilihan diingat di localStorage; kunjungan pertama ikut sistem. */
export function useSettings() {
  const [theme, setThemeState] = useState<Theme>(read);
  useEffect(() => applyTheme(document.documentElement, theme), [theme]);
  const setTheme = useCallback((t: Theme) => {
    try { localStorage.setItem(THEME_KEY, t); } catch { /* mode privat: pilihan hanya berlaku sesi ini */ }
    setThemeState(t);
  }, []);
  return { theme, setTheme };
}
