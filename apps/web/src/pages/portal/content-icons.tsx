/**
 * Outline-icon set for Notifications + Webinar Registrations, matching the
 * same hand-authored convention as settings-icons.tsx (~1.4 stroke, no fill,
 * currentColor) so both redesigned pages share one consistent icon family.
 */
type IconProps = { className?: string };

const common = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function BookIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M2.5 3.2c1.6-.5 3.2-.5 4.8 0v9.6c-1.6-.5-3.2-.5-4.8 0V3.2Z" />
      <path d="M13.5 3.2c-1.6-.5-3.2-.5-4.8 0v9.6c1.6-.5 3.2-.5 4.8 0V3.2Z" />
    </svg>
  );
}

export function ClipboardCheckIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3.5" y="2.8" width="9" height="11" rx="1.2" />
      <path d="M6 2.8c0-.6.5-1.1 1.1-1.1h1.8c.6 0 1.1.5 1.1 1.1v.7H6v-.7Z" />
      <path d="m5.8 8 1.6 1.6L10.2 6.6" />
    </svg>
  );
}

export function AwardIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="8" cy="6.5" r="3.8" />
      <path d="M6 9.6 4.8 14l3.2-1.7L11.2 14 10 9.6" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="2" y="3" width="12" height="10.5" rx="1.2" />
      <path d="M2 6.2h12M5.2 1.8v2.4M10.8 1.8v2.4" />
    </svg>
  );
}

export function VideoIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="2" y="4.2" width="8.2" height="7.6" rx="1.1" />
      <path d="m10.2 6.8 3.3-2v6.4l-3.3-2Z" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.2v4M8 5.2v.1" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="m3 8.5 3 3 7-7" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 1.8a4 4 0 0 0-4 4c0 3-1 4.1-1.4 4.6-.2.2 0 .6.3.6h10.2c.3 0 .5-.4.3-.6-.4-.5-1.4-1.6-1.4-4.6a4 4 0 0 0-4-4Z" />
      <path d="M6.4 13a1.6 1.6 0 0 0 3.2 0" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      width={16}
      height={10}
      viewBox="0 0 16 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M10.5 1l4 4-4 4M14 5H1" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...common} width={10} height={10} viewBox="0 0 10 10" className={className}>
      <path d="m3 1.5 4 3.5-4 3.5" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.4 1.4" />
    </svg>
  );
}
