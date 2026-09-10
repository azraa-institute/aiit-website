import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from '@/components/primitives/Button';

/**
 * A portal empty state. Never a dead end — always an invitation to begin
 * or a clear pointer to where the thing will appear once real data exists.
 * No fabricated cards, counts or activity.
 */
export function PortalEmpty({
  eyebrow,
  title,
  body,
  steps,
  action,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  /** An optional lightweight path, e.g. Discover → Learn → Certify. */
  steps?: string[];
  action?: { label: string; to: string };
  /** An optional secondary line rendered under the action. */
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('portal-empty', className)}>
      <div className="portal-empty__inner">
        {eyebrow ? <p className="portal-empty__eyebrow">{eyebrow}</p> : null}
        <h2 className="portal-empty__title">{title}</h2>
        <p className="portal-empty__body">{body}</p>

        {action ? (
          <div className="portal-empty__cta">
            <Button as="link" to={action.to} arrow>
              {action.label}
            </Button>
          </div>
        ) : null}

        {aside ? <p className="portal-empty__aside">{aside}</p> : null}
      </div>

      {steps && steps.length > 0 ? (
        <ol className="portal-empty__steps" aria-label="How the AIIT journey works">
          {steps.map((s, i) => (
            <li key={s} className="portal-empty__step" style={{ '--s': i } as React.CSSProperties}>
              <span className="portal-empty__step-mark" aria-hidden="true" />
              <span className="portal-empty__step-label">{s}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** A minimal inline pointer for sub-pages that just need "nothing here yet". */
export function PortalNote({
  title,
  children,
  to,
  toLabel,
}: {
  title: string;
  children: React.ReactNode;
  to?: string;
  toLabel?: string;
}) {
  return (
    <div className="portal-note">
      <h2 className="portal-note__title">{title}</h2>
      <p className="portal-note__body">{children}</p>
      {to && toLabel ? (
        <Link to={to} className="portal-note__link">
          {toLabel}
          <span aria-hidden="true"> &rarr;</span>
        </Link>
      ) : null}
    </div>
  );
}
