interface IconProps {
  className?: string;
}

const common = { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="6" cy="5.5" r="2.25" />
      <path d="M1.8 13.5c.5-2.4 2.2-3.8 4.2-3.8s3.7 1.4 4.2 3.8" />
      <circle cx="11.5" cy="6" r="1.8" />
      <path d="M10.3 10c1.6.2 2.7 1.4 3.1 3.3" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 1.8 13 3.6v4c0 3.3-2.1 5.6-5 6.6-2.9-1-5-3.3-5-6.6v-4Z" />
      <path d="M5.6 8 7.3 9.7l3-3.2" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="1.8" y="3" width="12.4" height="11" rx="1.2" />
      <path d="M1.8 6.3h12.4" />
      <path d="M4.6 1.5v3M11.4 1.5v3" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M6.3 9.7 9.7 6.3" />
      <path d="M7.6 4.2 9 2.8a2.6 2.6 0 0 1 3.7 3.7L11.3 7.9" />
      <path d="M8.4 11.8 7 13.2a2.6 2.6 0 0 1-3.7-3.7l1.4-1.4" />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8.6 1.8H13v4.4a1.2 1.2 0 0 1-.35.85l-5.6 5.6a1.2 1.2 0 0 1-1.7 0L2.1 9.4a1.2 1.2 0 0 1 0-1.7l5.6-5.6a1.2 1.2 0 0 1 .9-.3Z" />
      <circle cx="10.3" cy="4.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TicketIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M1.8 5.4a1.4 1.4 0 0 0 0 2.7v1.5a1.2 1.2 0 0 0 1.2 1.2h10a1.2 1.2 0 0 0 1.2-1.2V8.1a1.4 1.4 0 0 1 0-2.7V4.2A1.2 1.2 0 0 0 13 3H3a1.2 1.2 0 0 0-1.2 1.2v1.2Z" />
      <path d="M6.5 3v9.8" strokeDasharray="1.6 1.4" />
    </svg>
  );
}

export function BankIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M1.5 5.6 8 1.8l6.5 3.8Z" />
      <path d="M2.3 5.6v6.9M5.4 5.6v6.9M8 5.6v6.9M10.6 5.6v6.9M13.7 5.6v6.9" />
      <path d="M1.5 12.5h13" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M10.4 2.4a1.6 1.6 0 0 1 2.3 2.3L4.8 12.6l-3 .7.7-3Z" />
      <path d="M9.3 3.5l2.3 2.3" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M3 2.2h2.3l1 2.8-1.4 1.3a8 8 0 0 0 3.8 3.8l1.3-1.4 2.8 1v2.3c0 .7-.6 1.2-1.3 1.1A11 11 0 0 1 2 3.5c-.1-.7.4-1.3 1-1.3Z" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 14.2S12.8 9.8 12.8 6.3a4.8 4.8 0 1 0-9.6 0C3.2 9.8 8 14.2 8 14.2Z" />
      <circle cx="8" cy="6.2" r="1.7" />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M4 1.8h5.2L12 4.6v9.6a.8.8 0 0 1-.8.8H4a.8.8 0 0 1-.8-.8V2.6a.8.8 0 0 1 .8-.8Z" />
      <path d="M9.2 1.8v2.8H12" />
      <path d="M5.2 8h5.6M5.2 10.4h5.6" />
    </svg>
  );
}

export function BarChartIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M2.5 13.5v-4M7 13.5V5.2M11.5 13.5V8.3" />
      <path d="M1.8 13.5h12.4" />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg {...common} width={12} height={12} className={className}>
      <path d="M6.3 2.5H3.4a1 1 0 0 0-1 1v7.1a1 1 0 0 0 1 1h7.1a1 1 0 0 0 1-1V7.7" />
      <path d="M9.4 2h3.1v3.1M12.5 2 7.2 7.3" />
    </svg>
  );
}
