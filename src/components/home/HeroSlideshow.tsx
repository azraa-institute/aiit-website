import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimationEvent } from 'react';
import { HERO_SLIDES } from '@/data/hero';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { Button } from '@/components/primitives/Button';
import { Plate } from '@/components/primitives/Plate';
import { cn } from '@/lib/cn';
import './hero.css';

/** How long each slide is held — must match the progress-bar animation duration. */
const INTERVAL = 7200;

const isImageUrl = (s: string) => /^(https?:)?\/\//.test(s) || s.startsWith('/');

export function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const regionRef = useRef<HTMLElement>(null);

  const count = HERO_SLIDES.length;
  const go = useCallback((next: number) => setActive((next + count) % count), [count]);
  const advance = useCallback(() => setActive((a) => (a + 1) % count), [count]);

  /* Warm the browser cache for every slide up front, so a slide never begins
     its turn before its artwork is ready to show. */
  useEffect(() => {
    HERO_SLIDES.forEach((s) => {
      if (isImageUrl(s.image)) {
        const img = new Image();
        img.src = s.image;
      }
    });
  }, []);

  /* The slide advances only when the active progress bar has animated all the
     way to its end (see onProgressEnd). Under reduced motion there is no
     progress animation and no timer — the slideshow holds still and changes
     only when the visitor uses the dots, arrows or swipe. */

  const onProgressEnd = useCallback(
    (e: AnimationEvent<HTMLSpanElement>) => {
      if (e.animationName === 'hero-fill' && !paused && !reduced) advance();
    },
    [paused, reduced, advance],
  );

  useEffect(() => {
    const el = regionRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(active - 1);
      if (e.key === 'ArrowRight') go(active + 1);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [active, go]);

  return (
    <section
      className={cn('hero', 'on-ink', paused && 'is-paused')}
      aria-label="AIIT featured"
      aria-roledescription="carousel"
      ref={regionRef}
      tabIndex={-1}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 48) go(active + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="hero__stage">
        {HERO_SLIDES.map((s, i) => (
          <div key={s.id} className={cn('hero__bg', i === active && 'is-active')} aria-hidden="true">
            <Plate source={s.image} seed={`hero-${s.id}`} motif={s.motif} tone="ink" ratio={16 / 9} alt="" />
          </div>
        ))}
        <div className="hero__scrim" aria-hidden="true" />
      </div>

      <div className="hero__inner container container--wide">
        {HERO_SLIDES.map((s, i) => (
          <article
            key={s.id}
            className={cn('hero__slide', i === active && 'is-active')}
            aria-hidden={i !== active}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {i === active ? (
              <h1 className="hero__heading">{s.heading}</h1>
            ) : (
              <p className="hero__heading" aria-hidden="true">
                {s.heading}
              </p>
            )}
            <p className="hero__subtext">{s.subtext}</p>
            <div className="hero__actions">
              <Button as="link" to={s.cta.to} size="lg" arrow>
                {s.cta.label}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="hero__controls container container--wide">
        <div className="hero__progress" role="tablist" aria-label="Choose slide">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === active}
              aria-label={s.heading}
              className={cn('hero__dot', i === active && 'is-active')}
              onClick={() => go(i)}
            >
              <span
                className="hero__dot-fill"
                style={{ animationDuration: `${INTERVAL}ms` }}
                onAnimationEnd={i === active ? onProgressEnd : undefined}
              />
            </button>
          ))}
        </div>

        <div className="hero__arrows">
          <span className="hero__counter">
            {String(active + 1).padStart(2, '0')} <span aria-hidden="true">/</span>{' '}
            {String(count).padStart(2, '0')}
          </span>
          <button aria-label="Previous slide" onClick={() => go(active - 1)}>
            <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
              <path d="M5 1 1 5l4 4M1 5h21" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          <button aria-label="Next slide" onClick={() => go(active + 1)}>
            <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
              <path d="M17 1l4 4-4 4M21 5H0" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          {!reduced && (
            <button
              className="hero__playpause"
              aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? (
                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                  <path d="M1 1l10 6-10 6z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                  <path d="M1 1h3v12H1zM8 1h3v12H8z" fill="currentColor" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
