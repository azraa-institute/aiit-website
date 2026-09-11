/**
 * The hero "referral ecosystem" visual — a central AIIT node with four
 * satellites (Student, Creator, Enrolment, Reward). Same restrained
 * line-art language as the homepage's FocusVisuals: thin strokes, small
 * accent dots, nothing neon. Lines draw themselves in and nodes appear
 * with a stagger once `active` (driven by the hero scrolling into view).
 *
 * Two geometries are rendered — a radial "X" for desktop/tablet and a
 * genuine top-to-bottom flow for mobile (not a shrunk copy of the same
 * diagram) — and CSS swaps which is visible at the 640px breakpoint, so
 * there's no layout-detection JS and both share the same `active` state.
 */

const RADIAL_NODES = [
  { key: 'student', label: 'Student', x: 120, y: 90 },
  { key: 'creator', label: 'Creator', x: 400, y: 90 },
  { key: 'enrolment', label: 'Enrolment', x: 120, y: 300 },
  { key: 'reward', label: 'Reward', x: 400, y: 300 },
] as const;

const RADIAL_CENTER = { x: 260, y: 195 };

/** Two inputs converge on AIIT, which flows down through enrolment to reward. */
const FLOW_NODES = [
  { key: 'student', label: 'Student', x: 70, y: 60 },
  { key: 'creator', label: 'Creator', x: 170, y: 60 },
  { key: 'enrolment', label: 'Enrolment', x: 120, y: 360 },
  { key: 'reward', label: 'Reward', x: 120, y: 500 },
] as const;

const FLOW_CENTER = { x: 120, y: 210 };
/** Which flow node each line/segment originates from — student & creator both feed
 * the center; enrolment continues on from the center; reward continues from enrolment. */
const FLOW_LINES = [
  { key: 'student', x1: FLOW_NODES[0].x, y1: FLOW_NODES[0].y, x2: FLOW_CENTER.x, y2: FLOW_CENTER.y },
  { key: 'creator', x1: FLOW_NODES[1].x, y1: FLOW_NODES[1].y, x2: FLOW_CENTER.x, y2: FLOW_CENTER.y },
  { key: 'enrolment', x1: FLOW_CENTER.x, y1: FLOW_CENTER.y, x2: FLOW_NODES[2].x, y2: FLOW_NODES[2].y },
  { key: 'reward', x1: FLOW_NODES[2].x, y1: FLOW_NODES[2].y, x2: FLOW_NODES[3].x, y2: FLOW_NODES[3].y },
] as const;

export function AffiliateNetwork({ active }: { active: boolean }) {
  return (
    <>
      <svg
        viewBox="0 0 520 390"
        className="affiliate-network affiliate-network--radial"
        aria-hidden="true"
        data-active={active ? '' : undefined}
      >
        {RADIAL_NODES.map((n, i) => (
          <line
            key={`line-${n.key}`}
            x1={RADIAL_CENTER.x}
            y1={RADIAL_CENTER.y}
            x2={n.x}
            y2={n.y}
            className="affiliate-network__line"
            style={{ transitionDelay: `${i * 120}ms` }}
          />
        ))}
        {RADIAL_NODES.map((n, i) => (
          <line
            key={`flow-${n.key}`}
            x1={RADIAL_CENTER.x}
            y1={RADIAL_CENTER.y}
            x2={n.x}
            y2={n.y}
            className="affiliate-network__flow"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}

        <g className="affiliate-network__center">
          <circle cx={RADIAL_CENTER.x} cy={RADIAL_CENTER.y} r="34" />
          <text x={RADIAL_CENTER.x} y={RADIAL_CENTER.y + 5} textAnchor="middle">
            AIIT
          </text>
        </g>

        {RADIAL_NODES.map((n, i) => (
          <g
            key={n.key}
            className="affiliate-network__node"
            style={{ transitionDelay: `${180 + i * 130}ms` }}
          >
            <circle cx={n.x} cy={n.y} r="5.5" />
            <circle cx={n.x} cy={n.y} r="22" className="affiliate-network__ring" />
            <text x={n.x} y={n.y + (n.y < RADIAL_CENTER.y ? -34 : 46)} textAnchor="middle">
              {n.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>

      <svg
        viewBox="0 0 240 570"
        className="affiliate-network affiliate-network--flow"
        aria-hidden="true"
        data-active={active ? '' : undefined}
      >
        {FLOW_LINES.map((l, i) => (
          <line
            key={`line-${l.key}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            className="affiliate-network__line"
            style={{ transitionDelay: `${i * 120}ms` }}
          />
        ))}
        {FLOW_LINES.map((l, i) => (
          <line
            key={`flowline-${l.key}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            className="affiliate-network__flow"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}

        <g className="affiliate-network__center">
          <circle cx={FLOW_CENTER.x} cy={FLOW_CENTER.y} r="34" />
          <text x={FLOW_CENTER.x} y={FLOW_CENTER.y + 5} textAnchor="middle">
            AIIT
          </text>
        </g>

        {FLOW_NODES.map((n, i) => (
          <g
            key={n.key}
            className="affiliate-network__node"
            style={{ transitionDelay: `${180 + i * 130}ms` }}
          >
            <circle cx={n.x} cy={n.y} r="5.5" />
            <circle cx={n.x} cy={n.y} r="22" className="affiliate-network__ring" />
            <text x={n.x} y={n.y + (n.y < FLOW_CENTER.y ? -34 : 46)} textAnchor="middle">
              {n.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </>
  );
}
