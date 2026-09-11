/**
 * Hand-drawn illustrations for the "Our focus areas" panel — one per primary
 * domain, built to explain the concept rather than decorate it. Same line-art
 * language as Plate.tsx (thin strokes, accent dots, quiet grid) on a shared
 * 480x320 viewBox. The draw-in / pulse animation is CSS-driven
 * (technology-domains.css) and skipped under prefers-reduced-motion.
 */

const LINE = { stroke: 'rgba(244,239,231,0.34)', strokeWidth: 1.1, fill: 'none' } as const;
const LINE_FAINT = { stroke: 'rgba(244,239,231,0.14)', strokeWidth: 1, fill: 'none' } as const;

function Grid() {
  const lines = [];
  for (let x = 0; x <= 480; x += 40) lines.push(<path key={`v${x}`} d={`M${x} 0V320`} {...LINE_FAINT} />);
  for (let y = 0; y <= 320; y += 40) lines.push(<path key={`h${y}`} d={`M0 ${y}H480`} {...LINE_FAINT} />);
  return <g>{lines}</g>;
}

/** Artificial Intelligence — a layered model (input / hidden / output) with
 *  curated, not fully-dense, connections and signal flowing right. */
function AiVisual() {
  const input = [70, 130, 190, 250].map((y) => [96, y] as const);
  const hidden = [50, 115, 180, 245, 300].map((y) => [252, y] as const);
  const output = [110, 190, 260].map((y) => [408, y] as const);
  const links: [readonly [number, number], readonly [number, number]][] = [];
  input.forEach((a, i) => {
    hidden.forEach((b, j) => {
      if ((i + j) % 2 === 0) links.push([a, b]);
    });
  });
  hidden.forEach((a, i) => {
    output.forEach((b, j) => {
      if ((i + j) % 2 === 1) links.push([a, b]);
    });
  });
  return (
    <svg viewBox="0 0 480 320" className="focus-visual" aria-hidden="true">
      <Grid />
      <g stroke="rgba(244,239,231,0.16)" strokeWidth="1" fill="none">
        {links.map(([a, b], i) => (
          <path key={i} d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} />
        ))}
      </g>
      <g fill="rgba(244,239,231,0.55)">
        {input.map((p, i) => (
          <circle key={`i${i}`} cx={p[0]} cy={p[1]} r={3.4} />
        ))}
        {hidden.map((p, i) => (
          <circle key={`h${i}`} cx={p[0]} cy={p[1]} r={3.8} />
        ))}
      </g>
      <g className="focus-visual__pulse" fill="var(--item-glow)">
        {output.map((p, i) => (
          <circle key={`o${i}`} cx={p[0]} cy={p[1]} r={5} style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
      </g>
      <path d="M408 110 L408 190 L408 260" {...LINE} strokeDasharray="1 7" strokeLinecap="round" />
    </svg>
  );
}

/** Data Science — a bar cluster with a trend line over scattered
 *  observations: raw data resolving into a reading of it. */
function DataVisual() {
  const bars = [40, 68, 52, 90, 74, 110, 96].map((h, i) => ({ x: 64 + i * 32, h }));
  const scatter = [
    [300, 220], [326, 190], [352, 205], [378, 160], [404, 178], [430, 130], [452, 145],
  ] as const;
  return (
    <svg viewBox="0 0 480 320" className="focus-visual" aria-hidden="true">
      <Grid />
      <g fill="rgba(244,239,231,0.16)">
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={260 - b.h} width="18" height={b.h} rx="1.5" />
        ))}
      </g>
      <path
        d={`M${scatter[0][0]} ${scatter[0][1]} ${scatter
          .slice(1)
          .map((p) => `L${p[0]} ${p[1]}`)
          .join(' ')}`}
        {...LINE}
      />
      <g fill="var(--item-glow)" className="focus-visual__pulse">
        {scatter.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3.2} style={{ animationDelay: `${i * 0.22}s` }} />
        ))}
      </g>
      <path d="M40 260H460" {...LINE_FAINT} />
    </svg>
  );
}

/** Cloud Computing — server racks feeding a cloud outline, with distributed
 *  storage / compute nodes wired to it. */
function CloudVisual() {
  const racks = [
    [80, 220], [150, 236], [220, 214], [300, 236], [370, 220],
  ] as const;
  return (
    <svg viewBox="0 0 480 320" className="focus-visual" aria-hidden="true">
      <Grid />
      <path
        d="M170 130a52 52 0 0 1 100-18 40 40 0 0 1 56 34 42 42 0 0 1-6 84H182a44 44 0 0 1-12-100Z"
        {...LINE}
      />
      <g stroke="rgba(244,239,231,0.16)" strokeWidth="1" fill="none">
        {racks.map((r, i) => (
          <path key={i} d={`M${r[0]} ${r[1]} L${240} 210`} />
        ))}
      </g>
      <g fill="none" stroke="rgba(244,239,231,0.4)" strokeWidth="1.1">
        {racks.map((r, i) => (
          <rect key={i} x={r[0] - 14} y={r[1]} width="28" height="34" rx="2" />
        ))}
      </g>
      <g className="focus-visual__pulse" fill="var(--item-glow)">
        {racks.map((r, i) => (
          <circle key={i} cx={r[0]} cy={r[1] + 34 + 8} r={2.6} style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
      </g>
    </svg>
  );
}

/** Quantum Computing — three overlapping orbital planes around a shared
 *  centre (superposition) with a couple of qubit markers. */
function QuantumVisual() {
  const cx = 240;
  const cy = 168;
  const orbits = [0, 55, 115];
  return (
    <svg viewBox="0 0 480 320" className="focus-visual" aria-hidden="true">
      <Grid />
      {orbits.map((rot, i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={130}
          ry={48}
          transform={`rotate(${rot} ${cx} ${cy})`}
          stroke="rgba(244,239,231,0.3)"
          strokeWidth="1"
          fill="none"
        />
      ))}
      <circle cx={cx} cy={cy} r={5} fill="rgba(244,239,231,0.6)" />
      <g className="focus-visual__pulse" fill="var(--item-glow)">
        <circle cx={cx + 130} cy={cy} r={4.4} />
        <circle cx={cx - 65} cy={cy - 41.6} r={4.4} style={{ animationDelay: '0.6s' }} />
        <circle cx={cx - 65} cy={cy + 41.6} r={4.4} style={{ animationDelay: '1.2s' }} />
      </g>
    </svg>
  );
}

/** Edge Computing — a core node with device-nodes around the perimeter, each
 *  wired back and partly to each other: compute pushed out to the data. */
function EdgeVisual() {
  const cx = 240;
  const cy = 160;
  const nodes = [
    [90, 70], [380, 60], [70, 240], [400, 250], [240, 40], [240, 290],
  ] as const;
  return (
    <svg viewBox="0 0 480 320" className="focus-visual" aria-hidden="true">
      <Grid />
      <g stroke="rgba(244,239,231,0.18)" strokeWidth="1" fill="none">
        {nodes.map((n, i) => (
          <path key={i} d={`M${cx} ${cy} L${n[0]} ${n[1]}`} />
        ))}
        <path d="M90 70 L240 40 L380 60" />
        <path d="M70 240 L240 290 L400 250" />
      </g>
      <circle cx={cx} cy={cy} r={9} fill="none" stroke="rgba(244,239,231,0.55)" strokeWidth="1.3" />
      <circle cx={cx} cy={cy} r={3.4} fill="rgba(244,239,231,0.7)" />
      <g className="focus-visual__pulse" fill="var(--item-glow)">
        {nodes.map((n, i) => (
          <circle key={i} cx={n[0]} cy={n[1]} r={4.4} style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>
    </svg>
  );
}

const VISUALS = {
  'artificial-intelligence': AiVisual,
  'data-science': DataVisual,
  'cloud-computing': CloudVisual,
  'quantum-computing': QuantumVisual,
  'edge-computing': EdgeVisual,
} as const;

export function FocusVisual({ domainId }: { domainId: string }) {
  const Visual = VISUALS[domainId as keyof typeof VISUALS];
  return Visual ? <Visual /> : null;
}
