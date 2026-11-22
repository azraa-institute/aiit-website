import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { COUNTRIES } from '@/data/countries';
import { flagSrc } from '@/lib/phone';
import './phone-country-select.css';

interface PhoneCountrySelectProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  hint?: string;
}

/**
 * Custom "flag + dial code" dropdown for the phone country-code picker --
 * not a native <select>, because <option> can only render plain text (no
 * <img>), and flag emoji fall back to plain 2-letter codes on Windows
 * Chrome (confirmed live). Same trigger/panel/click-outside pattern as
 * PortalLayout's profile menu, plus a search box since the list runs to
 * ~170 countries.
 */
export function PhoneCountrySelect({ label, value, onChange, required, hint }: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listboxId = `${labelId}-listbox`;
  const optionId = (i: number) => `${labelId}-option-${i}`;

  const selected = COUNTRIES.find((c) => c.code === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase() === q,
      )
    : COUNTRIES;

  useEffect(() => {
    if (open) searchRef.current?.focus();
    setActiveIndex(-1);
  }, [open]);

  // The filtered list shifts under the user as they type -- any previously
  // highlighted index would otherwise point at the wrong row (or past the
  // end of a now-shorter list).
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function select(code: string) {
    onChange(code);
    setOpen(false);
    setQuery('');
  }

  // Standard "editable combobox with listbox popup" keyboard pattern -- focus
  // stays on the search input throughout (so typing keeps filtering) while
  // the arrow keys move a virtual highlight (aria-activedescendant) through
  // the option list; Enter commits it.
  function onSearchKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      select(filtered[activeIndex].code);
    }
  }

  // Tab/Shift+Tab away from the whole widget should close the panel instead
  // of leaving it floating open with focus elsewhere on the page.
  function onWrapBlur(e: FocusEvent<HTMLDivElement>) {
    if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className="field">
      <label className="field__label" id={labelId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="pcs" ref={wrapRef} onBlur={onWrapBlur}>
        <button
          type="button"
          className="field__control pcs__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={labelId}
          onClick={() => setOpen((o) => !o)}
        >
          {selected ? (
            <span className="pcs__chosen">
              <img className="pcs__flag" src={flagSrc(selected.code)} alt="" width={20} height={15} />
              <span>+{selected.dial}</span>
            </span>
          ) : (
            <span className="pcs__placeholder">Code</span>
          )}
          <svg className="field__chevron pcs__chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        {open && (
          <div className="pcs__panel">
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              className="pcs__search"
              placeholder="Search country"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              aria-label="Search country"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            />
            {/* Explicit tabIndex=-1 (not just leaving it unset) -- Chrome
                otherwise makes a scrollable region like this one an implicit
                Tab stop for keyboard-scrolling purposes, which put a dead
                stop in the middle of tabbing through this widget. */}
            <ul id={listboxId} className="pcs__list" role="listbox" aria-labelledby={labelId} tabIndex={-1}>
              {filtered.map((c, i) => (
                <li key={c.code}>
                  <button
                    id={optionId(i)}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={c.code === value}
                    className={cn('pcs__option', c.code === value && 'is-selected', i === activeIndex && 'is-active')}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => select(c.code)}
                  >
                    <img className="pcs__flag" src={flagSrc(c.code)} alt="" width={20} height={15} />
                    <span className="pcs__option-dial">+{c.dial}</span>
                    <span className="pcs__option-name">{c.name}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="pcs__empty">No country matches &quot;{query}&quot;.</li>}
            </ul>
          </div>
        )}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}
