/**
 * The Blueprint hero visual — an original interpretation of "the academic
 * passport": a single vertical spine (AIIT → Certification → Portfolio →
 * Portfolio → University → Global Career) with five thin lines branching
 * off toward the five destination countries. Same restrained line-art
 * language as AffiliateNetwork/FocusVisuals — no map, no globe, no glow.
 */

const SPINE = [
  { key: 'aiit', label: 'AIIT', y: 46 },
  { key: 'certification', label: 'Certification', y: 186 },
  { key: 'portfolio', label: 'Portfolio', y: 326 },
  { key: 'university', label: 'University', y: 466 },
  { key: 'career', label: 'Global career', y: 606 },
] as const;

const SPINE_X = 34;

const DESTINATIONS = [
  { code: 'MY', y: 262 },
  { code: 'SG', y: 356 },
  { code: 'AE', y: 450 },
  { code: 'AU', y: 544 },
  { code: 'IN', y: 638 },
] as const;

const BRANCH_X = 236;

export function BlueprintPathway({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 260 680"
      className="blueprint-pathway"
      aria-hidden="true"
      data-active={active ? '' : undefined}
    >
      {/* the spine */}
      {SPINE.slice(0, -1).map((n, i) => (
        <line
          key={`spine-${n.key}`}
          x1={SPINE_X}
          y1={n.y}
          x2={SPINE_X}
          y2={SPINE[i + 1].y}
          className="blueprint-pathway__spine-line"
          style={{ transitionDelay: `${i * 130}ms` }}
        />
      ))}

      {/* branches from the final node out to each destination */}
      {DESTINATIONS.map((d, i) => (
        <path
          key={`branch-${d.code}`}
          d={`M${SPINE_X} ${SPINE[SPINE.length - 1].y} C ${SPINE_X + 90} ${SPINE[SPINE.length - 1].y}, ${BRANCH_X - 60} ${d.y}, ${BRANCH_X} ${d.y}`}
          className="blueprint-pathway__branch"
          style={{ transitionDelay: `${560 + i * 90}ms` }}
        />
      ))}

      {SPINE.map((n, i) => (
        <g key={n.key} className="blueprint-pathway__node" style={{ transitionDelay: `${i * 130}ms` }}>
          <circle cx={SPINE_X} cy={n.y} r={i === SPINE.length - 1 ? 6 : 4.5} />
          <text x={SPINE_X + 16} y={n.y + 4.5}>
            {n.label}
          </text>
        </g>
      ))}

      {DESTINATIONS.map((d, i) => (
        <g
          key={d.code}
          className="blueprint-pathway__dest"
          style={{ transitionDelay: `${640 + i * 90}ms` }}
        >
          <circle cx={BRANCH_X} cy={d.y} r="14" className="blueprint-pathway__dest-ring" />
          <circle cx={BRANCH_X} cy={d.y} r="3.5" className="blueprint-pathway__dest-dot" />
          <text x={BRANCH_X} y={d.y + 4.2} textAnchor="middle">
            {d.code}
          </text>
        </g>
      ))}
    </svg>
  );
}
