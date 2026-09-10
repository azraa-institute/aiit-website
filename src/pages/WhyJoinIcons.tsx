/**
 * One consistent line-icon set for the seven "Why Join AIIT" reasons —
 * 24×24, 1.5 stroke, round joins, matched to the site's established SVG
 * style (see home/RoadmapIcons.tsx).
 */
const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export type ReasonIcon =
  | 'courses'
  | 'fees'
  | 'flexible'
  | 'certification'
  | 'support'
  | 'community'
  | 'guidance';

export const REASON_ICONS: Record<ReasonIcon, JSX.Element> = {
  courses: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" {...S} />
      <path d="M8 8h7M8 11.5h7" {...S} />
    </svg>
  ),
  fees: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M12.5 3.5 20.5 8v8l-8 4.5-8-4.5V8Z" {...S} />
      <path d="M12.5 8.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 1 0 0-4.6ZM12.5 3.5v3M12.5 17.5v3" {...S} />
    </svg>
  ),
  flexible: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="2.5" y="5" width="14" height="10" rx="1.4" {...S} />
      <path d="M2.5 17.5h14" {...S} />
      <rect x="17.5" y="8.5" width="5" height="9" rx="1.2" {...S} />
      <path d="M19.2 15.6h1.6" {...S} />
    </svg>
  ),
  certification: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle cx="12" cy="9" r="5.5" {...S} />
      <path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5" {...S} />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" {...S} />
      <circle cx="12" cy="12" r="3.2" {...S} />
      <path d="m6.2 6.2 3.3 3.3M14.5 14.5l3.3 3.3M17.8 6.2l-3.3 3.3M9.5 14.5l-3.3 3.3" {...S} />
    </svg>
  ),
  community: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle cx="7" cy="8" r="2.6" {...S} />
      <circle cx="17" cy="8" r="2.6" {...S} />
      <circle cx="12" cy="17" r="2.6" {...S} />
      <path d="M8.9 9.6 10.3 15M15.1 9.6 13.7 15M9.4 7.4h5.2" {...S} />
    </svg>
  ),
  guidance: (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M3.5 6h11l3 3-3 3h-11z" {...S} />
      <path d="M8 6V3M8 21v-3" {...S} />
    </svg>
  ),
};
