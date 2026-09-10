import type { ReactNode } from 'react';
import type { StageIcon, AdvantageIcon } from '@/data/ecosystem';

/**
 * One consistent line-icon set for the success roadmap and the AIIT Advantage
 * bar. 24×24, 1.5 stroke, round joins — matched to the site's SVG style.
 */
const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const STAGE: Record<StageIcon, ReactNode> = {
  enroll: (
    <>
      <path d="M6 3h8l4 4v14H6z" {...S} />
      <path d="M14 3v4h4M9 12h6M9 16h6" {...S} />
    </>
  ),
  learn: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" {...S} />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5" {...S} />
    </>
  ),
  certificate: (
    <>
      <circle cx="12" cy="9" r="5" {...S} />
      <path d="M9 13.5 7.5 21l4.5-2.5L16.5 21 15 13.5" {...S} />
    </>
  ),
  portfolio: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" {...S} />
      <path d="M9 6V4h6v2M3 12h18M12 12v2" {...S} />
    </>
  ),
  internship: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" {...S} />
      <path d="M9 7V5h6v2M3 13h18M11 12h2" {...S} />
    </>
  ),
  education: (
    <>
      <path d="M12 4 2 9l10 5 10-5z" {...S} />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M21 9.5V15" {...S} />
    </>
  ),
  global: (
    <>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" {...S} />
    </>
  ),
};

const ADVANTAGE: Record<AdvantageIcon, ReactNode> = {
  mentor: (
    <>
      <circle cx="9" cy="8" r="3.2" {...S} />
      <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" {...S} />
      <path d="M16 9.5a2.6 2.6 0 1 0 0-5M20.5 20c0-3-1.7-5-4-5.6" {...S} />
    </>
  ),
  live: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" {...S} />
      <path d="M8 20h8M12 16v4" {...S} />
      <circle cx="12" cy="10" r="2.2" {...S} />
    </>
  ),
  badge: (
    <>
      <path d="M12 3 4 6v5c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6z" {...S} />
      <path d="m9 11 2 2 4-4" {...S} />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="m15.5 8.5-2 5-5 2 2-5z" {...S} />
    </>
  ),
  path: (
    <>
      <path d="M6 21c0-4 3-4 3-8s-3-4-3-8" {...S} />
      <circle cx="6" cy="5" r="2" {...S} />
      <circle cx="9" cy="13" r="2" {...S} />
      <circle cx="6" cy="21" r="2" {...S} />
      <path d="M13 12h8M18 9l3 3-3 3" {...S} />
    </>
  ),
  globe: (
    <>
      <circle cx="11" cy="11" r="7.5" {...S} />
      <path d="M3.5 11h15M11 3.5c2.6 2.6 2.6 12.4 0 15M11 3.5c-2.6 2.6-2.6 12.4 0 15" {...S} />
      <path d="m17 17 4 4" {...S} />
    </>
  ),
};

export function StageGlyph({ name }: { name: StageIcon }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      {STAGE[name]}
    </svg>
  );
}

export function AdvantageGlyph({ name }: { name: AdvantageIcon }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {ADVANTAGE[name]}
    </svg>
  );
}
