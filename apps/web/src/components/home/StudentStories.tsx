import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimationEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  STUDENT_STORIES,
  REVIEWS_HEADING,
  REVIEWS_EYEBROW,
  REVIEWS_SUBTITLE,
} from '@/data/testimonials';
import { SITE } from '@/data/site';
import { Section } from '@/components/primitives/Section';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/cn';
import './student-stories.css';

/** How long each review is held before auto-advancing. */
const INTERVAL = 9000;

const LEFT_MARGINALIA = ['Different', 'People', 'One Global', 'Community'];
/** Reuses the real site tagline instead of inventing new marginalia copy. */
const RIGHT_MARGINALIA = SITE.advantageLine
  .split('.')
  .map((w) => w.trim())
  .filter(Boolean);

/** A small, self-contained "digital cartography" field — the same deterministic
 * mulberry32 point-field technique used for the footer globe, recomposed at a
 * much smaller scale and a lower dot count for a quiet corner decoration. Kept
 * local to this file so it stays fully scoped to the reviews section. */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMapField() {
  const rnd = mulberry32(7071926);
  const dots: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < 130; i++) {
    dots.push({
      x: rnd() * 340,
      y: rnd() * 220,
      r: 0.6 + rnd() * 1,
      o: 0.25 + rnd() * 0.4,
    });
  }
  const arcs = [
    'M10 190 C 90 120, 160 150, 210 90 S 320 40, 335 15',
    'M0 60 C 70 90, 140 60, 205 95 S 300 130, 340 110',
    'M40 20 C 100 60, 150 40, 220 70',
  ];
  return { dots, arcs };
}
const MAP_FIELD = buildMapField();

function MapDecoration() {
  return (
    <svg className="stories-globe__art" viewBox="0 0 340 220" aria-hidden="true" fill="none">
      <g stroke="rgba(154,123,79,0.3)" strokeWidth="0.7">
        {MAP_FIELD.arcs.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="#a9895a">
        {MAP_FIELD.dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={p.o} />
        ))}
      </g>
    </svg>
  );
}

const ArrowRight = () => (
  <svg width="16" height="12" viewBox="0 0 18 14" aria-hidden="true">
    <path
      d="M11 1l6 6-6 6M17 7H1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** "Student Stories" — a premium editorial slideshow of the ten real student
 * reviews. Visual redesign only: the underlying carousel state, keyboard
 * handling, auto-advance timing and review data are unchanged from before. */
export function StudentStories() {
  const count = STUDENT_STORIES.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const regionRef = useRef<HTMLDivElement>(null);

  const go = useCallback((n: number) => setActive((n + count) % count), [count]);
  const next = useCallback(() => setActive((a) => (a + 1) % count), [count]);

  const onTimerEnd = useCallback(
    (e: AnimationEvent<HTMLSpanElement>) => {
      if (e.animationName === 'stories-fill' && !paused && !reduced) next();
    },
    [paused, reduced, next],
  );

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

  const deck = useMemo(() => {
    const prevIdx = (active - 1 + count) % count;
    const nextIdx = (active + 1) % count;
    return [
      { story: STUDENT_STORIES[prevIdx], role: 'prev' as const },
      { story: STUDENT_STORIES[active], role: 'center' as const },
      { story: STUDENT_STORIES[nextIdx], role: 'next' as const },
    ];
  }, [active, count]);

  const story = STUDENT_STORIES[active];
  if (!story) return null;

  return (
    <Section id="stories" size="lg" className="stories-editorial">
      <div className="stories-editorial__grid" aria-hidden="true" />

      <div className="container container--wide stories-editorial__inner">
        {/* Decorative editorial framing — photos, marginalia, handwritten
           annotations and the map motif. Positioned relative to this same
           container as the carousel below (not the viewport), so their
           fixed offsets stay correctly clear of the arrows/cards at every
           width where this tier is active. Only shown on very large
           desktop screens (see the responsive rules) — the composition of
           two full-size framing photographs plus a full three-card
           carousel genuinely needs that much width to avoid crowding. */}
        <figure className="stories-photo stories-photo--left" aria-hidden="true">
          <img src="/assets/student-stories/left-learner.webp" alt="" loading="lazy" decoding="async" />
          <svg className="stories-photo__contour stories-photo__contour--left" viewBox="0 0 240 480" aria-hidden="true" fill="none">
            <path d="M4 40 C -6 160, 30 340, 120 460" stroke="rgba(154,123,79,0.4)" strokeWidth="1" />
          </svg>
        </figure>
        <div className="stories-marginalia stories-marginalia--left" aria-hidden="true">
          <p>
            {LEFT_MARGINALIA.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </p>
          <span className="stories-marginalia__rule" />
        </div>
        <p className="stories-script stories-script--left" aria-hidden="true">
          Skills
          <br />
          for a Brighter
          <br />
          Tomorrow
          <span className="stories-script__rule" />
        </p>

        <figure className="stories-photo stories-photo--right" aria-hidden="true">
          <img src="/assets/student-stories/right-learner.webp" alt="" loading="lazy" decoding="async" />
          <svg className="stories-photo__contour stories-photo__contour--right" viewBox="0 0 240 480" aria-hidden="true" fill="none">
            <path d="M236 20 C 246 140, 210 320, 120 440" stroke="rgba(154,123,79,0.4)" strokeWidth="1" />
          </svg>
        </figure>
        <p className="stories-script stories-script--right" aria-hidden="true">
          Learning
          <br />
          without
          <br />
          Borders
        </p>
        <div className="stories-globe" aria-hidden="true">
          <MapDecoration />
          <span className="stories-globe__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" />
              <path
                d="M1.5 10h17M10 1.5c3 2.4 3 14.6 0 17M10 1.5c-3 2.4-3 14.6 0 17"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </span>
        </div>
        <div className="stories-marginalia stories-marginalia--right" aria-hidden="true">
          <p>
            {RIGHT_MARGINALIA.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </p>
          <span className="stories-marginalia__rule" />
        </div>

        <header className="stories-head">
          <p className="stories-eyebrow">
            <span aria-hidden="true" />
            {REVIEWS_EYEBROW}
            <span aria-hidden="true" />
          </p>
          <h2 className="stories-headline">{REVIEWS_HEADING}</h2>
          <p className="stories-sub">{REVIEWS_SUBTITLE}</p>
        </header>

        <div
          className={cn('stories-deck', paused && 'is-paused')}
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
            className="stories-arrow stories-arrow--prev"
            aria-label="Previous review"
            onClick={() => go(active - 1)}
          >
            <svg width="16" height="12" viewBox="0 0 18 14" aria-hidden="true">
              <path
                d="M7 1 1 7l6 6M1 7h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="stories-cards">
            {deck.map(({ story: s, role }) => (
              <article
                key={s.id}
                className={cn('stories-card', `stories-card--${role}`, role === 'center' && 'is-active')}
                aria-current={role === 'center' || undefined}
                aria-hidden={role !== 'center'}
                tabIndex={role === 'center' ? undefined : -1}
                onClick={role !== 'center' ? () => go(STUDENT_STORIES.indexOf(s)) : undefined}
              >
                {role === 'center' && <span className="stories-card__featured">Featured</span>}
                <span className="stories-card__quote" aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote className="stories-card__text">
                  <p>{s.quote}</p>
                </blockquote>
                <footer className="stories-card__person">
                  <div className="stories-card__person-row">
                    <span className="stories-card__avatar" aria-hidden="true">
                      {s.initials}
                    </span>
                    <span className="stories-card__who">
                      <span className="stories-card__name">{s.name}</span>
                      <span className="stories-card__loc">{s.location}</span>
                    </span>
                  </div>
                  <span className="stories-card__role">{s.title}</span>
                </footer>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="stories-arrow stories-arrow--next"
            aria-label="Next review"
            onClick={() => go(active + 1)}
          >
            <ArrowRight />
          </button>

          <span
            key={active}
            className="stories-timer"
            style={{ animationDuration: `${INTERVAL}ms` }}
            onAnimationEnd={onTimerEnd}
            aria-hidden="true"
          />
        </div>

        <div className="stories-progress">
          <div className="stories-progress__dots" role="tablist" aria-label="Choose a review">
            {STUDENT_STORIES.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === active}
                aria-label={s.name}
                className={cn('stories-progress__dot', i === active && 'is-active')}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <span className="stories-progress__count">
            {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          </span>
        </div>

        <div className="stories-cta-wrap">
          <Link to="/why-join" className="stories-cta">
            Read more success stories
            <ArrowRight />
          </Link>
        </div>
      </div>
    </Section>
  );
}
