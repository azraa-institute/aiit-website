import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';

/** Minimal fetch-with-reload hook for the staff screens. `path === null` skips the request. */
export type FetchState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

export function useApiFetch<T>(path: string | null): FetchState<T> & { reload: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let alive = true;
    apiFetch<T>(path)
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((err: unknown) =>
        alive && setState({ status: 'error', message: err instanceof Error ? err.message : 'Could not load this.' }),
      );
    return () => {
      alive = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  // Memoized so the returned object is only a new reference when `state`
  // itself actually changes -- a consumer with `useEffect(..., [result])`
  // (AdminBlogEditorPage/AdminWebinarEditorPage both do this) would
  // otherwise re-run that effect on every render, including the ones its
  // own setState calls trigger, which is a tight infinite render loop that
  // makes every button except a real network-bound action (like a form's
  // submit) appear to silently do nothing -- their state updates get
  // stomped back to the loaded data before the next paint.
  return useMemo(() => ({ ...state, reload }), [state, reload]);
}
