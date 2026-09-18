/**
 * Restrained, single-stroke icon set for a course's "What you'll explore"
 * technologies -- same idiom as home/DomainIcons.tsx (thin currentColor
 * strokes, one shared viewBox/weight). Deliberately generic pictograms, not
 * reproductions of third-party brand marks: a course's tech list already
 * names the real platform/tool (OpenAI, Cisco, Ethereum, ...) in its own
 * label/tooltip, so the icon only needs to carry the *kind* of thing it is
 * (an AI platform, a network concept, a business concept, ...), shared
 * consistently across every course that touches that kind.
 */
import type { SVGProps } from 'react';

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Svg(props: SVGProps<SVGSVGElement>) {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props} />;
}

function SparkIcon() {
  return (
    <Svg>
      <path d="M8 1.4 9.3 6.7 14.6 8 9.3 9.3 8 14.6 6.7 9.3 1.4 8 6.7 6.7Z" {...common} />
    </Svg>
  );
}

function AgentsIcon() {
  return (
    <Svg>
      <g {...common}>
        <path d="M8 4.6 3.4 10.6M8 4.6l4.6 6" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="8" cy="3.4" r="1.5" />
        <circle cx="3" cy="11.4" r="1.5" />
        <circle cx="13" cy="11.4" r="1.5" />
      </g>
    </Svg>
  );
}

function ChainIcon() {
  return (
    <Svg>
      <rect x="1.6" y="5" width="6" height="4.2" rx="2" {...common} />
      <rect x="8.4" y="5" width="6" height="4.2" rx="2" {...common} />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg>
      <circle cx="6.6" cy="6.6" r="4.4" {...common} />
      <path d="M9.9 9.9 14 14" {...common} />
    </Svg>
  );
}

function DatabaseIcon() {
  return (
    <Svg>
      <ellipse cx="8" cy="3.4" rx="5.2" ry="1.8" {...common} />
      <path d="M2.8 3.4v9.2c0 1 2.3 1.8 5.2 1.8s5.2-.8 5.2-1.8V3.4" {...common} />
      <path d="M2.8 8c0 1 2.3 1.8 5.2 1.8S13.2 9 13.2 8" {...common} />
    </Svg>
  );
}

function CodeIcon() {
  return (
    <Svg>
      <path d="M5.4 3.6 1.4 8l4 4.4M10.6 3.6l4 4.4-4 4.4" {...common} />
    </Svg>
  );
}

function ChartIcon() {
  return (
    <Svg>
      <g {...common}>
        <path d="M2 14V6M7.4 14V2M12.8 14V9" />
        <path d="M1.4 14h13.2" />
      </g>
    </Svg>
  );
}

function CloudIcon() {
  return (
    <Svg>
      <path
        d="M4.6 11.6a2.8 2.8 0 0 1-.3-5.58 3.6 3.6 0 0 1 6.9-1.2 2.6 2.6 0 0 1 1.1 5Z"
        {...common}
      />
    </Svg>
  );
}

function NetworkIcon() {
  return (
    <Svg>
      <g {...common}>
        <path d="M2 4h12M2 8h12M2 12h12" />
        <path d="M4 4v8M12 4v8" opacity="0.5" />
      </g>
    </Svg>
  );
}

function RouterIcon() {
  return (
    <Svg>
      <rect x="1.6" y="8.2" width="12.8" height="4.4" rx="1" {...common} />
      <path d="M5 8.2V6M8 8.2V4.6M11 8.2V6" {...common} />
      <circle cx="4" cy="10.4" r="0.7" fill="currentColor" stroke="none" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg>
      <path d="M8 1.6 13.4 3.6v4c0 4-2.4 6.4-5.4 7.8-3-1.4-5.4-3.8-5.4-7.8v-4Z" {...common} />
      <path d="M5.6 8 7.3 9.6l3.1-3.6" {...common} />
    </Svg>
  );
}

function TerminalIcon() {
  return (
    <Svg>
      <rect x="1.6" y="2.6" width="12.8" height="10.8" rx="1.2" {...common} />
      <path d="M4.2 6.2 6.6 8l-2.4 1.8M8.4 10.4h3" {...common} />
    </Svg>
  );
}

function ChipIcon() {
  return (
    <Svg>
      <rect x="4.2" y="4.2" width="7.6" height="7.6" rx="1" {...common} />
      <path d="M6.4 4.2V1.6M9.6 4.2V1.6M6.4 14.4v-2.6M9.6 14.4v-2.6M4.2 6.4H1.6M4.2 9.6H1.6M14.4 6.4h-2.6M14.4 9.6h-2.6" {...common} />
    </Svg>
  );
}

function AtomIcon() {
  return (
    <Svg>
      <ellipse cx="8" cy="8" rx="6" ry="2.6" {...common} />
      <ellipse cx="8" cy="8" rx="6" ry="2.6" {...common} transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6" ry="2.6" {...common} transform="rotate(120 8 8)" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

function ContractIcon() {
  return (
    <Svg>
      <path d="M4 1.6h6l2 2v10.8H4Z" {...common} />
      <path d="M6.2 7 7.6 8.4l2.6-3" {...common} />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg>
      <circle cx="8" cy="8" r="6.2" {...common} />
      <path d="M2 8h12M8 1.8c1.8 1.7 2.8 4 2.8 6.2S9.8 12.5 8 14.2C6.2 12.5 5.2 10.2 5.2 8S6.2 3.5 8 1.8Z" {...common} />
    </Svg>
  );
}

function MegaphoneIcon() {
  return (
    <Svg>
      <path d="M2 6.4v3.2l3.4 1V5.4Z" {...common} />
      <path d="M5.4 5.4 12 2.6v10.8L5.4 10.6" {...common} />
      <path d="M4.6 10.6 5.6 13.6" {...common} />
    </Svg>
  );
}

function BriefcaseIcon() {
  return (
    <Svg>
      <rect x="1.6" y="5" width="12.8" height="8.2" rx="1.2" {...common} />
      <path d="M5.6 5V3.4a1 1 0 0 1 1-1h2.8a1 1 0 0 1 1 1V5" {...common} />
      <path d="M1.6 8.6h12.8" {...common} />
    </Svg>
  );
}

function MonitorIcon() {
  return (
    <Svg>
      <rect x="1.6" y="2.6" width="12.8" height="8.4" rx="1" {...common} />
      <path d="M5.6 14h4.8M8 11v3" {...common} />
    </Svg>
  );
}

function ChatBubbleIcon() {
  return (
    <Svg>
      <path d="M2 3.4h12v7.2H6.8L4 13V10.6H2Z" {...common} />
    </Svg>
  );
}

const ICONS: Record<string, () => JSX.Element> = {
  spark: SparkIcon,
  agents: AgentsIcon,
  chain: ChainIcon,
  search: SearchIcon,
  database: DatabaseIcon,
  code: CodeIcon,
  chart: ChartIcon,
  cloud: CloudIcon,
  network: NetworkIcon,
  router: RouterIcon,
  shield: ShieldIcon,
  terminal: TerminalIcon,
  chip: ChipIcon,
  atom: AtomIcon,
  contract: ContractIcon,
  globe: GlobeIcon,
  megaphone: MegaphoneIcon,
  briefcase: BriefcaseIcon,
  monitor: MonitorIcon,
  chatbubble: ChatBubbleIcon,
};

/** Falls back to the generic spark glyph for an icon key this set doesn't know yet, rather than rendering nothing. */
export function TechIcon({ icon }: { icon: string }) {
  const Icon = ICONS[icon] ?? SparkIcon;
  return <Icon />;
}
