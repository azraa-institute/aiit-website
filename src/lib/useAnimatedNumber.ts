import { useEffect, useRef, useState } from 'react';

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Smoothly interpolates a displayed number toward `target` whenever it
 * changes — used for the affiliate calculator's live earnings figure and
 * for count-up-on-reveal stats. Skips the animation entirely under
 * `prefers-reduced-motion`, jumping straight to the target.
 */
export function useAnimatedNumber(target: number, durationMs = 500): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = EASE_OUT(t);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

/**
 * Count up from 0 to `target` once, the first time `active` becomes true
 * (e.g. driven by an IntersectionObserver reveal) — for the earning-rate
 * figures that animate in when the section enters the viewport.
 */
export function useCountUpOnce(target: number, active: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * EASE_OUT(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);

  return value;
}
