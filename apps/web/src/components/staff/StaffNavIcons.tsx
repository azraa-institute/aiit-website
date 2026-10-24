/**
 * Outline-icon set for the admin sidebar's top-level entries (Dashboard +
 * each group header) -- same hand-authored convention as
 * apps/web/src/pages/portal/ContentIcons.tsx (~1.4 stroke, no fill,
 * currentColor), scaled up slightly (18px) since these sit at the nav's
 * most prominent level, not inline with body text.
 */
type IconProps = { className?: string };

const common = {
  width: 18,
  height: 18,
  viewBox: '0 0 18 18',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M2.5 8.2 9 2.8l6.5 5.4" />
      <path d="M4 7v6.3c0 .6.4 1 1 1h8c.6 0 1-.4 1-1V7" />
      <path d="M7 14.3V10h4v4.3" />
    </svg>
  );
}

export function PeopleIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="6.5" cy="6" r="2.3" />
      <path d="M2.2 14.2c.3-2.4 2.1-4 4.3-4s4 1.6 4.3 4" />
      <circle cx="12.3" cy="5.3" r="1.7" />
      <path d="M11 9.6c1.7.1 3.1 1.5 3.4 3.5" />
    </svg>
  );
}

export function AcademicsIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M1.8 6.4 9 3.2l7.2 3.2L9 9.6l-7.2-3.2Z" />
      <path d="M4.6 7.8v3c0 1 2 2.2 4.4 2.2s4.4-1.2 4.4-2.2v-3" />
      <path d="M16.2 6.4v4.3" />
    </svg>
  );
}

export function ContentIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M5 2.3h5.3L13.7 5.7V15a.8.8 0 0 1-.8.8H5a.8.8 0 0 1-.8-.8V3a.8.8 0 0 1 .8-.7Z" />
      <path d="M10 2.3V6h3.7" />
      <path d="M6.3 9.4h5.4M6.3 11.8h5.4M6.3 7h2.4" />
    </svg>
  );
}

export function SupportIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="9" cy="9" r="6.3" />
      <circle cx="9" cy="9" r="2.6" />
      <path d="m4.5 4.5 2.8 2.8M13.5 4.5l-2.8 2.8M4.5 13.5l2.8-2.8M13.5 13.5l-2.8-2.8" />
    </svg>
  );
}

export function FinanceIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M2.5 5.3c0-.9.8-1.6 1.8-1.6h8.4c1 0 1.8.7 1.8 1.6v7.4c0 .9-.8 1.6-1.8 1.6H4.3c-1 0-1.8-.7-1.8-1.6V5.3Z" />
      <path d="M2.5 7.4h12.9" />
      <circle cx="11.8" cy="10.5" r=".9" />
    </svg>
  );
}

export function SystemIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="9" cy="9" r="2.4" />
      <path d="M9 2.3v2M9 13.7v2M15.7 9h-2M4.3 9h-2M13.7 4.3l-1.4 1.4M5.7 12.3l-1.4 1.4M13.7 13.7l-1.4-1.4M5.7 5.7 4.3 4.3" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M7.2 10.8 10.8 7.2" />
      <path d="M8.6 4.8 10 3.4a2.8 2.8 0 0 1 4 4L12.6 8.8" />
      <path d="M9.4 13.2 8 14.6a2.8 2.8 0 0 1-4-4l1.4-1.4" />
    </svg>
  );
}

export function MegaphoneIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M2.6 7.4h2.1l7-3.6v10.4l-7-3.6H2.6a.9.9 0 0 1-.9-.9V8.3a.9.9 0 0 1 .9-.9Z" />
      <path d="M5.3 10.6v2.6c0 .6.5 1.1 1.1 1.1h.4c.6 0 1.1-.5 1.1-1.1v-1.4" />
      <path d="M12.8 6.2c.9.6 1.5 1.6 1.5 2.8s-.6 2.2-1.5 2.8" />
    </svg>
  );
}
