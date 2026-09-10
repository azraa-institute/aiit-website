import { useEffect, useRef, useState } from 'react';

/**
 * True once the ref'd element has scrolled into view; stays true after
 * (a one-shot reveal trigger, same spirit as useScrollReveal but returning
 * React state instead of toggling a class — for driving count-ups,
 * staggered activation, etc.).
 */
export function useInView<T extends Element>(threshold = 0.35): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView];
}
