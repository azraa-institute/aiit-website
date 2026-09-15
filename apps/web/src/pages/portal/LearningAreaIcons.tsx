/**
 * Outline-icon set for the profile-completion wizard's "areas of interest"
 * cards (see data/learningAreas.ts) -- same hand-authored convention as
 * ContentIcons.tsx/SettingsIcons.tsx (~1.4 stroke, no fill, currentColor).
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

export function AiIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <path d="M8 1.5V4M8 12v2.5M1.5 8H4M12 8h2.5M3.6 3.6l1.6 1.6M10.8 10.8l1.6 1.6M12.4 3.6l-1.6 1.6M5.2 10.8l-1.6 1.6" />
    </svg>
  );
}

export function MachineLearningIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="3" cy="4" r="1.1" />
      <circle cx="3" cy="8" r="1.1" />
      <circle cx="3" cy="12" r="1.1" />
      <circle cx="9" cy="6" r="1.1" />
      <circle cx="9" cy="10" r="1.1" />
      <circle cx="14" cy="8" r="1.3" />
      <path d="M4 4.5 8 6M4 8 8 6M4 8 8 10M4 11.5 8 10M9.9 6 13 7.5M9.9 10 13 8.5" />
    </svg>
  );
}

export function DataScienceIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M2 13.5h12" />
      <rect x="3.2" y="8" width="2.2" height="5.5" />
      <rect x="6.9" y="5" width="2.2" height="8.5" />
      <rect x="10.6" y="9.5" width="2.2" height="4" />
    </svg>
  );
}

export function CybersecurityIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 1.8 13.5 3.6v4.2c0 3.6-2.3 6.2-5.5 7.4-3.2-1.2-5.5-3.8-5.5-7.4V3.6L8 1.8Z" />
      <path d="m5.8 8 1.6 1.6L10.2 6.6" />
    </svg>
  );
}

export function NetworkingIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M1.8 8h12.4M8 1.8c1.8 1.7 2.8 4 2.8 6.2s-1 4.5-2.8 6.2c-1.8-1.7-2.8-4-2.8-6.2S6.2 3.5 8 1.8Z" />
    </svg>
  );
}

export function CloudComputingIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M4.6 12h6.8a2.3 2.3 0 0 0 0-4.6h-.2a3.4 3.4 0 0 0-6.5-1 2.4 2.4 0 0 0-2.1 2.4c0 1.6 1.2 3 2.6 3.2Z" />
    </svg>
  );
}

export function BlockchainIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="1.8" y="5.3" width="5.4" height="5.4" rx="1.3" />
      <rect x="8.8" y="5.3" width="5.4" height="5.4" rx="1.3" />
      <path d="M7.2 8h1.6" />
    </svg>
  );
}

export function SoftwareDevelopmentIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4M9 3 7 13" />
    </svg>
  );
}

export function OtherAreaIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="4" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12" cy="8" r="1.2" />
    </svg>
  );
}
