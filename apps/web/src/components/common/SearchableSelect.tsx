import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import './searchable-select.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Shown as small muted context next to the label (e.g. a university's country) -- optional, most callers won't need it. */
  meta?: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  hint?: string;
  /** e.g. "Select a country first" while a cascading field (state -> city) has nothing to search yet. Disables the trigger entirely rather than opening an empty panel. */
  disabled?: boolean;
  disabledHint?: string;
  /** True while `options` is being fetched (state/city, loaded per selection) -- shows a quiet loading row instead of "No matches" so an empty list mid-fetch doesn't read as "there's nothing here". */
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * Generic searchable dropdown -- label + search box + filtered option list,
 * same trigger/panel/click-outside/keyboard-Escape mechanics as
 * PhoneCountrySelect (portal/PhoneCountrySelect.tsx), generalized: no
 * flags, and options come from the caller instead of the fixed COUNTRIES
 * list, so the same component covers University, State and City -- three
 * pickers that are each too long to browse as a plain <select> (thousands
 * of universities; every city in a state) but don't need PhoneCountrySelect's
 * image rendering.
 */
export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  required,
  hint,
  disabled,
  disabledHint,
  loading,
  emptyMessage,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listboxId = `${labelId}-listbox`;
  const optionId = (i: number) => `${labelId}-option-${i}`;

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

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

  function select(next: string) {
    onChange(next);
    setOpen(false);
    setQuery('');
  }

  // Standard "editable combobox with listbox popup" keyboard pattern -- focus
  // stays on the search input throughout (so typing keeps filtering) while
  // the arrow keys move a virtual highlight (aria-activedescendant) through
  // the option list; Enter commits it. Tab/Shift+Tab are left alone here so
  // native focus movement (onBlur below) handles leaving the widget.
  function onSearchKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (loading || filtered.length === 0) return;
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
      select(filtered[activeIndex].value);
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
      <div className="ssel" ref={wrapRef} onBlur={onWrapBlur}>
        <button
          type="button"
          className="field__control ssel__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={labelId}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={cn('ssel__value', !selected && 'ssel__value--placeholder')}>
            {selected ? selected.label : placeholder}
          </span>
          <svg className="field__chevron ssel__chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        {open && !disabled && (
          <div className="ssel__panel">
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              className="ssel__search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              aria-label={searchPlaceholder}
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            />
            {/* Explicit tabIndex=-1 (not just leaving it unset) -- Chrome
                otherwise makes a scrollable region like this one an implicit
                Tab stop for keyboard-scrolling purposes, which put a dead
                stop in the middle of tabbing through this widget. */}
            <ul id={listboxId} className="ssel__list" role="listbox" aria-labelledby={labelId} tabIndex={-1}>
              {loading ? (
                <li className="ssel__empty">Loading…</li>
              ) : filtered.length === 0 ? (
                <li className="ssel__empty">{emptyMessage ?? `No match for "${query}".`}</li>
              ) : (
                filtered.map((o, i) => (
                  // Not just o.value -- a caller's options can legitimately
                  // repeat a value (a handful of university names show up
                  // in more than one country in the bundled list), and a
                  // duplicate key would make React warn/misrender.
                  <li key={`${o.value}-${i}`}>
                    <button
                      id={optionId(i)}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={o.value === value}
                      className={cn('ssel__option', o.value === value && 'is-selected', i === activeIndex && 'is-active')}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => select(o.value)}
                    >
                      <span className="ssel__option-label">{o.label}</span>
                      {o.meta && <span className="ssel__option-meta">{o.meta}</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {disabled && disabledHint ? (
        <p className="field__hint">{disabledHint}</p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}
