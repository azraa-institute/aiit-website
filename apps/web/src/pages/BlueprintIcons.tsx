/**
 * One consistent line-icon set for the Blueprint page's two staged
 * sequences (the Learn/Certify/Progress/Globalize pathway, and the six-step
 * support journey) — 24×24, 1.5 stroke, round joins, matched to the site's
 * established SVG style (see home/RoadmapIcons.tsx).
 */
const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export type PathwayIcon = 'learn' | 'certify' | 'progress' | 'globalize';
export type JourneyIcon = 'planning' | 'university' | 'sop' | 'portfolio' | 'scholarship' | 'visa';

export const PATHWAY_ICONS: Record<PathwayIcon, JSX.Element> = {
  learn: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 0 4 23.5z" {...S} />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 1 2.5 2.5" {...S} />
    </svg>
  ),
  certify: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle cx="12" cy="9" r="5.5" {...S} />
      <path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5" {...S} />
    </svg>
  ),
  progress: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M4 20V13M11 20V8M18 20v-9" {...S} />
      <path d="M3 8.5 9.5 4l4 3L21 3" {...S} />
      <path d="M16.5 3H21v4.5" {...S} />
    </svg>
  ),
  globalize: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" {...S} />
      <path d="M3.5 12h17M12 3.5c2.7 2.3 4.2 5.3 4.2 8.5s-1.5 6.2-4.2 8.5c-2.7-2.3-4.2-5.3-4.2-8.5S9.3 5.8 12 3.5Z" {...S} />
    </svg>
  ),
};

export const JOURNEY_ICONS: Record<JourneyIcon, JSX.Element> = {
  planning: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 3 3.5 7.5 12 12l8.5-4.5Z" {...S} />
      <path d="M3.5 12 12 16.5 20.5 12M3.5 16 12 20.5 20.5 16" {...S} />
    </svg>
  ),
  university: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 3 2 8l10 5 10-5Z" {...S} />
      <path d="M6 10.5V17c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-6.5" {...S} />
      <path d="M22 8v6" {...S} />
    </svg>
  ),
  sop: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z" {...S} />
      <path d="M15 3v4h4M9 12h6M9 15.5h6M9 8.5h3" {...S} />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="3" y="7" width="18" height="12.5" rx="2" {...S} />
      <path d="M8.5 7V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v2M3 12.5h18" {...S} />
    </svg>
  ),
  scholarship: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="8.5" r="5" {...S} />
      <path d="M9 12.8 6.5 21l5.5-3 5.5 3-2.5-8.2" {...S} />
    </svg>
  ),
  visa: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" {...S} />
      <circle cx="9" cy="10" r="2.3" {...S} />
      <path d="M6 16.5c.6-1.6 1.8-2.5 3-2.5s2.4.9 3 2.5M14.5 8h4M14.5 11.5h4M14.5 15h3" {...S} />
    </svg>
  ),
};
