import { useState } from 'react';

/**
 * A boolean UI preference (e.g. "sidebar collapsed") remembered per browser
 * via localStorage -- a per-viewer convenience, never read back by the
 * server. Never throws: a blocked or unavailable store (private browsing,
 * cleared site data) just means the preference doesn't persist, rather than
 * breaking the page.
 */
export function usePersistedBoolean(key: string, initial = false): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : stored === '1';
    } catch {
      return initial;
    }
  });

  function set(next: boolean) {
    setValue(next);
    try {
      window.localStorage.setItem(key, next ? '1' : '0');
    } catch {
      // Private browsing, blocked storage, etc. -- the toggle still works this visit.
    }
  }

  return [value, set];
}
