import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { Button } from '@/components/primitives/Button';
import './guided-tour.css';

type StepIndex = 0 | 1 | 2 | 3 | 4;
type Phase = 'intro' | StepIndex | 'done';

interface Step {
  /** Matches a data-tour="..." attribute placed on the real nav element in PortalLayout.tsx. */
  target: string;
  eyebrow: string;
  title: string;
  body: string;
}

/**
 * "tour-*" ids are placed on the real portal nav in PortalLayout.tsx -- on
 * BOTH the desktop rail link and its mobile bottom-nav counterpart where one
 * exists (Dashboard/Courses/Certificates/Assignments), or on the always-
 * visible topbar identity button (Account) -- deliberately chosen so every
 * target is reachable without first opening the mobile hamburger menu.
 * resolveTarget() below picks whichever copy is actually on-screen.
 */
const STEPS: Step[] = [
  {
    target: 'tour-dashboard',
    eyebrow: 'Your command centre',
    title: 'Dashboard',
    body: 'This is your learning command centre. Come here for your overall activity, updates and important information.',
  },
  {
    target: 'tour-courses',
    eyebrow: 'Keep learning',
    title: 'My Courses',
    body: 'Your enrolled courses live here. Continue lessons, track your progress and return to your active learning.',
  },
  {
    target: 'tour-certificates',
    eyebrow: 'Your achievements',
    title: 'Certificates',
    body: "Certificates you've earned are collected here, making it easy to access and manage your achievements.",
  },
  {
    target: 'tour-assignments',
    eyebrow: 'Stay on track',
    title: 'Assignments & Resources',
    body: 'Course-related resources and assignments can be accessed from here and the relevant learning areas.',
  },
  {
    target: 'tour-account',
    eyebrow: 'Your identity',
    title: 'Account',
    body: 'Manage your personal information, account preferences and profile from here.',
  },
];

const MOBILE_BREAKPOINT = 768;
const SPOTLIGHT_PAD = 10;

interface GuidedTourProps {
  open: boolean;
  onClose: (status: 'completed' | 'skipped') => void;
}

/**
 * The guided portal tour -- a second, separate experience from
 * ProfileCompletionWizard (see that file's own doc comment), offered right
 * after profile completion or replayable from Settings. Own visual identity:
 * a compact intro/completion card (same dialog pattern as the wizard) for
 * the bookends, and for the 5 middle steps a full-viewport SVG-mask
 * spotlight (portal-rendered, so PortalLayout's blur/overflow/z-index never
 * interferes) plus an editorial tooltip that positions itself relative to
 * the real nav element it's describing.
 */
export function GuidedTour({ open, onClose }: GuidedTourProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; side: string } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLockBodyScroll(open);

  useEffect(() => {
    if (open) setPhase('intro');
  }, [open]);

  // Track viewport size (also used to derive the mobile bottom-sheet
  // breakpoint) so the spotlight SVG's own pixel coordinate space always
  // matches getBoundingClientRect()'s viewport-relative values 1:1.
  useEffect(() => {
    if (!open) return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  const isMobile = viewport.w > 0 && viewport.w < MOBILE_BREAKPOINT;

  // Resolve + track the current step's target element: scroll it into view,
  // then keep measuring on scroll/resize/its own size changes so the
  // spotlight and tooltip never drift out of sync with the real nav.
  useEffect(() => {
    if (!open || typeof phase !== 'number') {
      setRect(null);
      return;
    }
    const el = resolveTarget(STEPS[phase].target);
    if (!el) {
      setRect(null);
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });

    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const settleTimer = window.setTimeout(measure, reduce ? 0 : 380);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [open, phase]);

  // Position the floating tooltip once its own size is known (two-pass:
  // render, measure, place) -- skipped entirely on mobile, which docks the
  // tooltip as a fixed bottom sheet instead of floating near the target.
  useLayoutEffect(() => {
    if (isMobile || !rect || typeof phase !== 'number') {
      setTooltipPos(null);
      return;
    }
    const size = tooltipRef.current?.getBoundingClientRect();
    if (!size) return;
    setTooltipPos(computeTooltipPosition(rect, { w: size.width, h: size.height }, viewport));
    // Re-run once the tooltip has actually rendered at its real content
    // size (e.g. after fonts/copy change its height) -- viewport/rect stay
    // the dependency trigger for re-measuring on scroll/resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect, viewport, isMobile, phase]);

  // Focus + Escape/Tab handling for whichever panel is currently mounted
  // (intro/done card, or a step tooltip) -- same pattern as
  // ProfileCompletionWizard, generalised to one shared `.gt-panel` class
  // since only one panel is ever in the DOM at a time.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose('skipped');
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = document.querySelector<HTMLElement>('.gt-panel');
      const focusable = panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);

  if (!open) return null;

  function next() {
    setPhase((p) => (p === 'intro' ? 0 : typeof p === 'number' ? (p < 4 ? ((p + 1) as StepIndex) : 'done') : p));
  }
  function back() {
    setPhase((p) => (typeof p === 'number' && p > 0 ? ((p - 1) as StepIndex) : p));
  }

  const spotlightRect = rect
    ? {
        x: rect.x - SPOTLIGHT_PAD,
        y: rect.y - SPOTLIGHT_PAD,
        width: rect.width + SPOTLIGHT_PAD * 2,
        height: rect.height + SPOTLIGHT_PAD * 2,
      }
    : null;

  return createPortal(
    <div className="gt-root">
      {(phase === 'intro' || phase === 'done') && (
        <div className="gt-scrim">
          <div className="gt-card gt-panel on-ink" role="dialog" aria-modal="true" aria-labelledby="gt-title">
            <button type="button" className="gt-close" aria-label="Close tour" ref={closeRef} onClick={() => onClose('skipped')}>
              <CloseGlyph />
            </button>

            {phase === 'intro' ? (
              <>
                <p className="gt-eyebrow">Your AIIT.NETWORK portal</p>
                <h2 id="gt-title" className="gt-title">
                  Welcome to your learning space.
                </h2>
                <p className="gt-body">Let&apos;s take a short tour of the areas you&apos;ll use most.</p>
                <p className="gt-meta">5 steps &bull; about 1 minute</p>
                <div className="gt-actions">
                  <Button as="button" onClick={next}>
                    Start tour
                  </Button>
                  <Button as="button" variant="ghost" onClick={() => onClose('skipped')}>
                    Skip tour
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="gt-eyebrow">Orientation complete</p>
                <h2 id="gt-title" className="gt-title">
                  You&apos;re all set.
                </h2>
                <p className="gt-body">Your learning journey starts here. Explore AIIT.NETWORK at your own pace.</p>
                <div className="gt-actions">
                  <Button as="button" onClick={() => onClose('completed')}>
                    Explore AIIT.NETWORK
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {typeof phase === 'number' && (
        <>
          <svg className="gt-spotlight" aria-hidden="true">
            <defs>
              <mask id="gt-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={viewport.w} height={viewport.h}>
                <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="white" />
                {spotlightRect && (
                  <rect
                    rx={12}
                    fill="black"
                    style={{
                      x: spotlightRect.x,
                      y: spotlightRect.y,
                      width: spotlightRect.width,
                      height: spotlightRect.height,
                      transition: 'x .35s var(--ease-out), y .35s var(--ease-out), width .35s var(--ease-out), height .35s var(--ease-out)',
                    }}
                  />
                )}
              </mask>
            </defs>
            <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="rgba(20,17,15,0.74)" mask="url(#gt-mask)" />
            {spotlightRect && (
              <rect
                rx={12}
                fill="none"
                stroke="var(--brass)"
                strokeWidth={1.5}
                style={{
                  x: spotlightRect.x,
                  y: spotlightRect.y,
                  width: spotlightRect.width,
                  height: spotlightRect.height,
                  transition: 'x .35s var(--ease-out), y .35s var(--ease-out), width .35s var(--ease-out), height .35s var(--ease-out)',
                }}
              />
            )}
          </svg>

          <div
            ref={tooltipRef}
            className="gt-panel gt-tooltip on-ink"
            data-mobile={isMobile || undefined}
            data-side={!isMobile ? tooltipPos?.side : undefined}
            style={
              !isMobile && tooltipPos ? { left: tooltipPos.x, top: tooltipPos.y, visibility: 'visible' } : !isMobile ? { visibility: 'hidden' } : undefined
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="gt-step-title"
          >
            <button type="button" className="gt-close" aria-label="Close tour" ref={closeRef} onClick={() => onClose('skipped')}>
              <CloseGlyph />
            </button>
            <p className="gt-tooltip__count">
              {String(phase + 1).padStart(2, '0')} / 05
            </p>
            <p className="gt-eyebrow">{STEPS[phase].eyebrow}</p>
            <h2 id="gt-step-title" className="gt-tooltip__title">
              {STEPS[phase].title}
            </h2>
            <p className="gt-body">{STEPS[phase].body}</p>
            <div className="gt-actions">
              <Button as="button" onClick={next}>
                {phase === 4 ? 'Finish' : 'Next'}
              </Button>
              {phase > 0 && (
                <Button as="button" variant="ghost" onClick={back}>
                  Back
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" aria-hidden="true">
      <path d="M3 3l9 9M12 3 3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Picks whichever copy of a data-tour="<id>" element is actually on-screen
 * right now -- a target can exist twice in the DOM (desktop rail link +
 * mobile bottom-nav item) with only one ever really visible at a given
 * breakpoint. Checks real geometry (overlaps the viewport), not just
 * `offsetParent`, so an off-canvas-but-not-display:none rail item (e.g.
 * translated out of view) is correctly skipped in favour of the visible copy.
 */
function resolveTarget(id: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight) {
      return el;
    }
  }
  return candidates[0] ?? null;
}

/**
 * Simple collision-aware placement: tries right/bottom/left/top of the
 * target in that order, picks the first that fully fits the viewport (minus
 * a padding margin), and otherwise falls back to the first candidate,
 * clamped within bounds. No floating-position library -- 5 known target
 * shapes (nav items) don't need one.
 */
function computeTooltipPosition(
  target: DOMRect,
  tooltip: { w: number; h: number },
  viewport: { w: number; h: number },
): { x: number; y: number; side: string } {
  const gap = 20;
  const pad = 16;
  const candidates = [
    { side: 'right', x: target.right + gap, y: target.top + target.height / 2 - tooltip.h / 2 },
    { side: 'bottom', x: target.left + target.width / 2 - tooltip.w / 2, y: target.bottom + gap },
    { side: 'left', x: target.left - gap - tooltip.w, y: target.top + target.height / 2 - tooltip.h / 2 },
    { side: 'top', x: target.left + target.width / 2 - tooltip.w / 2, y: target.top - gap - tooltip.h },
  ];
  const fits = (c: { x: number; y: number }) =>
    c.x >= pad && c.y >= pad && c.x + tooltip.w <= viewport.w - pad && c.y + tooltip.h <= viewport.h - pad;
  const chosen = candidates.find(fits) ?? candidates[0];
  return {
    side: chosen.side,
    x: Math.min(Math.max(chosen.x, pad), Math.max(pad, viewport.w - tooltip.w - pad)),
    y: Math.min(Math.max(chosen.y, pad), Math.max(pad, viewport.h - tooltip.h - pad)),
  };
}
