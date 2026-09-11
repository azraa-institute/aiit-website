import { useEffect } from 'react';

/**
 * Progressive-enhancement scroll reveal. Any element carrying `[data-reveal]`
 * inside the mounted tree gets `.is-visible` when it enters the viewport.
 * Honors reduced motion (CSS handles the no-op) and cleans up per element.
 */
export function useScrollReveal(deps: unknown[] = []): void {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)'));
    if (nodes.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
