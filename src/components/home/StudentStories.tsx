import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimationEvent } from 'react';
import {
  STUDENT_STORIES,
  REVIEWS_HEADING,
  REVIEWS_EYEBROW,
} from '@/data/testimonials';
import { Section, SectionHeading } from '@/components/primitives/Section';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/cn';
import './student-stories.css';

/** How long each review is held — matches the progress-bar animation. */
const INTERVAL = 9000;

/** "Our Reviews" — an auto-advancing slideshow of student success stories. */
export function StudentStories() {
  const count = STUDENT_STORIES.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const regionRef = useRef<HTMLDivElement>(null);

  const go = useCallback((n: number) => setActive((n + count) % count), [count]);
  const next = useCallback(() => setActive((a) => (a + 1) % count), [count]);

  /* Normal motion advances when the progress bar finishes (see onProgressEnd).
     Under reduced motion there is no progress animation and no timer — the
     reviews change only when the visitor uses the arrows or dots. */

  const onProgressEnd = useCallback(
    (e: AnimationEvent<HTMLSpanElement>) => {
      if (e.animationName === 'stories-fill' && !paused && !reduced) next();
    },
    [paused, reduced, next],
  );

  // keyboard arrows when the slideshow region is focused
  useEffect(() => {
    const el = regionRef.current;
    if (!el) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft') go(active - 1);
      if (ev.key === 'ArrowRight') go(active + 1);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [active, go]);

  const story = STUDENT_STORIES[active];
  if (!story) return null;

  return (
    <Section id="stories" tone="ink" size="lg" className="stories-env">
      <div className="stories-env__atmosphere" aria-hidden="true" />
      <div
        className="stories-env__spotlight"
        aria-hidden="true"
        style={{ '--light-x': `${-6 + (active / Math.max(count - 1, 1)) * 12}%` } as React.CSSProperties}
      >
        <div className="stories-env__beam" />
        <div className="stories-env__source" />
        <div className="stories-env__pool" />
      </div>
      <div className="container container--wide">
        <SectionHeading eyebrow={REVIEWS_EYEBROW} title={REVIEWS_HEADING} align="center" />

        <div
          className={cn('stories', paused && 'is-paused')}
          ref={regionRef}
          tabIndex={-1}
          aria-roledescription="carousel"
          aria-label="Student success stories"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <button
            type="button"
            className="stories__arrow stories__arrow--prev"
            aria-label="Previous story"
            onClick={() => go(active - 1)}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
              <path d="M7 1 1 7l6 6M1 7h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <figure className="stories__card" key={story.id}>
            <h3 className="stories__title">{story.title}</h3>
            <blockquote className="stories__quote">
              <p>{story.quote}</p>
            </blockquote>
            <figcaption className="stories__person">
              <span className="stories__avatar" aria-hidden="true">
                {story.initials}
              </span>
              <span className="stories__who">
                <span className="stories__name">{story.name}</span>
                <span className="stories__loc">{story.location}</span>
              </span>
            </figcaption>
          </figure>

          <button
            type="button"
            className="stories__arrow stories__arrow--next"
            aria-label="Next story"
            onClick={() => go(active + 1)}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
              <path d="M11 1l6 6-6 6M17 7H1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="stories__progress" aria-hidden="true">
            <span
              key={active}
              className="stories__progress-fill"
              style={{ animationDuration: `${INTERVAL}ms` }}
              onAnimationEnd={onProgressEnd}
            />
          </div>

          <div className="stories__controls">
            <div className="stories__dots" role="tablist" aria-label="Choose a story">
              {STUDENT_STORIES.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={s.name}
                  className={cn('stories__dot', i === active && 'is-active')}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <span className="stories__count">
              {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}
