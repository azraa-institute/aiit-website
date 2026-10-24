/**
 * One icon per talking point -- same hand-authored outline convention as
 * StaffNavIcons.tsx/AdminAffiliatesIcons.tsx (no fill, currentColor,
 * rounded caps/joins), sized for the 48px icon badge on the Talking points
 * page rather than a nav row.
 */
type IconProps = { className?: string };

const common = {
  width: 22,
  height: 22,
  viewBox: '0 0 22 22',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function ClassesIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="8" cy="7.2" r="2.6" />
      <path d="M2.8 17c.4-2.9 2.6-4.8 5.2-4.8s4.8 1.9 5.2 4.8" />
      <circle cx="15" cy="6.3" r="2" />
      <path d="M13.5 12c2 .2 3.6 1.8 4.1 4.3" />
    </svg>
  );
}

export function PricingIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M10.4 2.5h7v7L9 18 2.5 11.5 10.4 2.5Z" />
      <circle cx="13.6" cy="6.1" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlexibleIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3.2" y="4" width="15.6" height="10.2" rx="1.2" />
      <path d="M1.6 17.3h18.8" />
    </svg>
  );
}

export function CertificateIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3" y="2.5" width="16" height="12.5" rx="1.2" />
      <path d="M6.2 6.2h9.6M6.2 9h9.6M6.2 11.8h5.5" />
      <path d="M8 15v4.3l2.8-1.6 2.8 1.6V15" />
    </svg>
  );
}

export function SupportIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M3.5 17.5v-5M9 17.5v-8M14.5 17.5v-3.2M20 17.5V6.5" />
    </svg>
  );
}

export function CommunityIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="11" cy="11" r="8.2" />
      <path d="M2.8 11h16.4M11 2.8c2.1 2.2 3.3 5.1 3.3 8.2s-1.2 6-3.3 8.2c-2.1-2.2-3.3-5.1-3.3-8.2s1.2-6 3.3-8.2Z" />
    </svg>
  );
}
