import { cn } from '@/lib/cn';
import type { JourneyPhaseState } from './learnerData';

/**
 * THE AIIT JOURNEY — the learner portal's signature element.
 *
 * AIIT's philosophy (Learn · Practice · Certify · Progress · Globalize)
 * drawn as a quiet constellation rather than a progress bar or flowchart.
 * Every node's state is derived from the real learner record: a brand-new
 * account shows five dormant nodes — a calm starting line, not an error.
 *
 * Pure HTML + CSS: a semantic ordered list with a connector layer. Motion
 * (the faint pulse on the active node) is CSS-only and removed under
 * prefers-reduced-motion.
 */
export function PortalJourney({
  phases,
  variant = 'full',
  className,
}: {
  phases: JourneyPhaseState[];
  variant?: 'full' | 'compact';
  className?: string;
}) {
  const activeIndex = phases.findIndex((p) => p.state === 'active');

  return (
    <ol
      className={cn('pj', `pj--${variant}`, className)}
      aria-label="Your AIIT learning journey"
      style={{ '--pj-count': phases.length } as React.CSSProperties}
    >
      {phases.map((p, i) => (
        <li
          key={p.phase}
          className="pj__node"
          data-state={p.state}
          data-reached={activeIndex >= 0 && i <= activeIndex ? '' : undefined}
          style={{ '--pj-i': i } as React.CSSProperties}
        >
          <span className="pj__marker" aria-hidden="true">
            <span className="pj__ring" />
            <span className="pj__core" />
          </span>
          <span className="pj__body">
            <span className="pj__label">{p.label}</span>
            {p.detail ? (
              <span className="pj__detail">{p.detail}</span>
            ) : (
              <span className="pj__detail pj__detail--state">
                {p.state === 'complete'
                  ? 'Complete'
                  : p.state === 'active'
                    ? 'In progress'
                    : 'Not started'}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
