/**
 * Icon set for the credential verification page, matching the same
 * hand-authored outline convention as portal/ContentIcons.tsx (1.4 stroke,
 * no fill, currentColor) -- kept local to this page rather than added to
 * that file since none of these (id card, shield, download, share, status
 * circles) belong to the portal's icon family.
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

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="2" y="3" width="12" height="10.5" rx="1.2" />
      <path d="M2 6.2h12M5.2 1.8v2.4M10.8 1.8v2.4" />
    </svg>
  );
}

export function IdCardIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="1.5" y="3.2" width="13" height="9.6" rx="1.3" />
      <circle cx="5.3" cy="7" r="1.3" />
      <path d="M3.4 10.6c.3-1 1-1.6 1.9-1.6s1.6.6 1.9 1.6M9 6.4h4M9 9h3" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 1.6 13.2 3.4v3.9c0 3.4-2.2 5.9-5.2 7.1-3-1.2-5.2-3.7-5.2-7.1V3.4L8 1.6Z" />
      <path d="m5.6 8 1.6 1.6L10.4 6" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 1.8v8.4M4.8 7.4 8 10.6l3.2-3.2" />
      <path d="M2.2 11.8v1.6c0 .5.4.9.9.9h9.8c.5 0 .9-.4.9-.9v-1.6" />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M4 1.8h5.2L12 4.6v9.1a.8.8 0 0 1-.8.8H4a.8.8 0 0 1-.8-.8V2.6c0-.4.4-.8.8-.8Z" />
      <path d="M9 1.8v2.6h2.8M5.2 8h5.2M5.2 10.4h5.2" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="12.2" cy="3.4" r="1.8" />
      <circle cx="3.8" cy="8" r="1.8" />
      <circle cx="12.2" cy="12.6" r="1.8" />
      <path d="m5.4 7 5.2-3M5.4 9l5.2 3" />
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

/** A filled green disc with a white check -- the verified-status badge's mark. */
export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <circle cx="9" cy="9" r="9" fill="currentColor" />
      <path d="m5.2 9.3 2.5 2.5 5-5.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A filled red disc with an X -- the invalid/revoked-status badge's mark. */
export function XCircleIcon({ className }: IconProps) {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <circle cx="9" cy="9" r="9" fill="currentColor" />
      <path d="M6.3 6.3l5.4 5.4M11.7 6.3l-5.4 5.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
