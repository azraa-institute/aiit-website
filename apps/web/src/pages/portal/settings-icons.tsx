/**
 * Small outline-icon set for Profile + Account Settings, matching the site's
 * existing hand-authored SVG convention (see PortalLayout's BottomIcon / bell
 * icon, Field.tsx's eye icon): ~1.4 stroke, no fill, currentColor.
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

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="2" y="4" width="14" height="10" rx="1.4" />
      <path d="m2.5 4.8 6 4.6 6-4.6" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3.5" y="8" width="11" height="7.5" rx="1.4" />
      <path d="M5.5 8V5.6a3.5 3.5 0 0 1 7 0V8" />
    </svg>
  );
}

export function MonitorIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="2" y="3" width="14" height="9" rx="1.2" />
      <path d="M6.5 15.5h5M9 12v3.5" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M9 2 3.5 4v4.4c0 3.6 2.4 5.9 5.5 7.1 3.1-1.2 5.5-3.5 5.5-7.1V4L9 2Z" />
      <path d="M6.3 9.1 8.2 11l3.5-3.8" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M2.5 9h13M9 2.5c2 2 2 11 0 13M9 2.5c-2 2-2 11 0 13" />
    </svg>
  );
}

export function LanguageIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M2.5 4.5h8M6 3v1.5M4.2 4.5c.4 3 2.2 5.2 4.3 6.6M8.5 4.5c-.7 3.4-2.7 6-6 7.8" />
      <path d="m10.5 15.5 2.7-6.2 2.8 6.2M11.4 13.4h3.6" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M3 5h12M7 5V3.6c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7V5" />
      <path d="M4.5 5 5.1 14.6c0 .5.5.9 1 .9h5.8c.5 0 .9-.4 1-.9L13.5 5" />
      <path d="M7.5 8v4.5M10.5 8v4.5" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M7.8 10.2a3 3 0 0 0 4.2 0l1.7-1.7a3 3 0 0 0-4.2-4.2l-1 1" />
      <path d="M10.2 7.8a3 3 0 0 0-4.2 0L4.3 9.5a3 3 0 0 0 4.2 4.2l1-1" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="6.5" y="6.5" width="9" height="9" rx="1.2" />
      <path d="M4.5 11.5h-1c-.6 0-1-.4-1-1v-7c0-.6.4-1 1-1h7c.6 0 1 .4 1 1v1" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="m3.5 9.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...common} width={16} height={16} viewBox="0 0 18 18" className={className}>
      <path d="M3 6.5c0-.6.4-1 1-1h1.6l.7-1.2c.2-.3.5-.5.9-.5h3.6c.4 0 .7.2.9.5l.7 1.2H14c.6 0 1 .4 1 1v7c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1v-7Z" />
      <circle cx="9" cy="10" r="2.6" />
    </svg>
  );
}
