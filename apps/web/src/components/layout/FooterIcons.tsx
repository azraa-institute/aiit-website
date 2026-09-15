/** Outline-icon set for the footer -- same hand-authored convention used
 * throughout the site (~1.4 stroke, no fill, currentColor). */
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

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 14.5s5-4.2 5-8.2A5 5 0 0 0 3 6.3c0 4 5 8.2 5 8.2Z" />
      <circle cx="8" cy="6.2" r="1.8" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M3.2 2.8h2.3l1 3-1.5 1.1a8 8 0 0 0 3.9 3.9l1.1-1.5 3 1v2.3c0 .7-.6 1.2-1.3 1.1-5.4-.6-9.5-4.7-10.1-10.1-.1-.7.4-1.3 1.1-1.3Z" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="2" y="4" width="12" height="8.5" rx="1.1" />
      <path d="m2.5 4.8 5.5 4 5.5-4" />
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

export function GraduationCapIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M1.5 6.2 8 3.5l6.5 2.7L8 8.9Z" />
      <path d="M4.3 7.5v3c0 1 1.7 1.9 3.7 1.9s3.7-.9 3.7-1.9v-3M14.5 6.2v4.3" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M1.8 8h12.4M8 1.8c2 2 2 12.4 0 12.4M8 1.8c-2 2-2 12.4 0 12.4" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 1.8 3 3.7v4.2c0 3.4 2.2 5.6 5 6.7 2.8-1.1 5-3.3 5-6.7V3.7Z" />
      <path d="M5.7 8 7.3 9.6l3.2-3.5" />
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
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M10.5 1l4 4-4 4M14 5H1" />
    </svg>
  );
}
