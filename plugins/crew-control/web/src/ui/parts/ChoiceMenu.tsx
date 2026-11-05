import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './icons.js';
import './ChoiceMenu.css';

export interface Choice { id: string; label: string; description?: string }

export interface ChoiceMenuProps {
  /** Nama kontrol untuk pembaca layar, mis. "Model". */
  title: string;
  choices: Choice[];
  value: string;
  onChange: (id: string) => void;
  /** Pratinjau: menu terbuka saat dimuat. */
  defaultOpen?: boolean;
  /** Arah buka; bawaan ke bawah. */
  align?: 'start' | 'end';
}

/** Tombol + listbox pilihan (nama + satu baris keterangan). Panah atas/bawah, Enter/Spasi memilih, Esc menutup. */
export function ChoiceMenu({ title, choices, value, onChange, defaultOpen = false, align = 'start' }: ChoiceMenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(() => Math.max(0, choices.findIndex((c) => c.id === value)));
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = choices.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (open && !defaultOpen) list.current?.focus(); }, [open, defaultOpen]);

  const show = () => { setActive(Math.max(0, choices.findIndex((c) => c.id === value))); setOpen(true); };
  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus(); };
  const pick = (i: number) => { const c = choices[i]; if (c) onChange(c.id); close(); };

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(choices.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(choices.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
  };

  return (
    <div className="cmenu" ref={root}>
      <button
        ref={button}
        type="button"
        className="cmenu__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${title}: ${current?.label ?? 'belum dipilih'}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show(); } }}
      >
        <span>{current?.label ?? title}</span>
        {Icon.chevronDown()}
      </button>
      {open && (
        <ul
          ref={list}
          id={id}
          className={`cmenu__list cmenu__list--${align}`}
          role="listbox"
          aria-label={title}
          tabIndex={-1}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onListKey}
        >
          {choices.map((c, i) => (
            <li
              key={c.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={c.id === value}
              className={`cmenu__opt${i === active ? ' is-active' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              <span className="cmenu__name">{c.label}</span>
              {c.description && <span className="cmenu__desc">{c.description}</span>}
              {c.id === value && <span className="cmenu__check">{Icon.check()}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
