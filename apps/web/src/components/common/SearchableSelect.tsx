import { useEffect, useId, useRef, useState } from 'react';
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

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

  return (
    <div className="field">
      <label className="field__label" id={labelId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="ssel" ref={wrapRef}>
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
              className="ssel__search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={searchPlaceholder}
            />
            <ul className="ssel__list" role="listbox" aria-labelledby={labelId}>
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
                      type="button"
                      role="option"
                      aria-selected={o.value === value}
                      className={cn('ssel__option', o.value === value && 'is-selected')}
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
