import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface ScrollProgressOptions {
  /** Called on every rAF frame with the raw 0→1 value — use it to write a CSS
   *  custom property straight to the DOM, avoiding a React re-render per frame. */
  onFrame?: (progress: number) => void;
  /** Minimum change before the returned React state updates. 1 (default) never
   *  updates state — pass e.g. 0.03 when you need a coarse reactive value. */
  stateStep?: number;
}

/**
 * Tracks how far the viewport has travelled through `ref`'s element, 0 → 1.
 * rAF-throttled; recomputes on scroll and resize. Drives the reading-progress
 * bar on article pages.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  { onFrame, stateStep = 1 }: ScrollProgressOptions = {},
): number {
  const [progress, setProgress] = useState(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    let raf = 0;

    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const span = rect.height - vh;
      const p =
        span <= 0
          ? rect.top <= 0
            ? 1
            : 0
          : Math.min(1, Math.max(0, -rect.top / span));

      onFrameRef.current?.(p);
      if (stateStep < 1) {
        setProgress((prev) => (Math.abs(prev - p) < stateStep ? prev : p));
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, stateStep]);

  return progress;
}
