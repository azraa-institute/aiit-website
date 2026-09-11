/**
 * Minimal 22x22 line-icon set for the "Our focus areas" nav — one per
 * primary domain. Same restrained, single-stroke idiom as RoadmapIcons.
 */

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function AiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <g {...common}>
        <path d="M5 6.2 11 4l6 2.2M5 15.8 11 18l6-2.2M5 6.2v9.6M17 6.2v9.6M11 4v14" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="5" cy="6.2" r="1.5" />
        <circle cx="17" cy="6.2" r="1.5" />
        <circle cx="11" cy="11" r="1.6" />
        <circle cx="5" cy="15.8" r="1.5" />
        <circle cx="17" cy="15.8" r="1.5" />
      </g>
    </svg>
  );
}

function DataIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <g {...common}>
        <path d="M3.5 18.5h15" />
        <path d="M6 18.5v-6M11 18.5V6M16 18.5v-9.5" />
        <path d="M3.8 12.2 8 8.6l3.6 2.4 6-6" />
      </g>
      <circle cx="17.6" cy="5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path
        d="M6.6 15.8a3.6 3.6 0 0 1-.4-7.18 4.6 4.6 0 0 1 8.9-1.5 3.4 3.4 0 0 1 1.4 6.48"
        {...common}
      />
      <path d="M6.6 15.8h9.9a3.4 3.4 0 0 0-.1-.2h-9.7Z" {...common} />
      <path d="M7 18.6h2.4M11 18.6h1.6M14 18.6h1.6" {...common} strokeWidth={1.2} />
    </svg>
  );
}

function QuantumIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <ellipse cx="11" cy="11" rx="8.4" ry="3.6" {...common} />
      <ellipse cx="11" cy="11" rx="8.4" ry="3.6" {...common} transform="rotate(60 11 11)" />
      <ellipse cx="11" cy="11" rx="8.4" ry="3.6" {...common} transform="rotate(120 11 11)" />
      <circle cx="11" cy="11" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function EdgeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <g {...common}>
        <path d="M11 11 4.5 6.5M11 11l6.5-4.5M11 11 4 15M11 11l7 4M11 11v6.6" />
      </g>
      <circle cx="11" cy="11" r="2" fill="currentColor" stroke="none" />
      <g fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="4.5" cy="6.5" r="1.6" />
        <circle cx="17.5" cy="6.5" r="1.6" />
        <circle cx="4" cy="15" r="1.6" />
        <circle cx="18" cy="15" r="1.6" />
        <circle cx="11" cy="18.4" r="1.6" />
      </g>
    </svg>
  );
}

const ICONS = {
  'artificial-intelligence': AiIcon,
  'data-science': DataIcon,
  'cloud-computing': CloudIcon,
  'quantum-computing': QuantumIcon,
  'edge-computing': EdgeIcon,
} as const;

export function DomainIcon({ id }: { id: string }) {
  const Icon = ICONS[id as keyof typeof ICONS];
  return Icon ? <Icon /> : null;
}
