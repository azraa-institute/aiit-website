/**
 * A dense, fine digital-earth field for the footer's institutional strip --
 * many small dots and thin contour/mesh arcs standing in for a topographic
 * globe, rather than a few bold latitude/longitude lines. No stroked outer
 * boundary: the sphere reads through the density and fade of the field
 * itself. Deterministic (fixed seed) so it's computed once, not per render.
 * Pure SVG, no image assets, no animation.
 */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE = 600;
const CX = 300;
const CY = 300;
const R = 280;

interface Dot {
  x: number;
  y: number;
  r: number;
  o: number;
}

interface GlobeField {
  contours: string[];
  fine: string[];
  dots: Dot[];
}

function buildGlobeField(): GlobeField {
  const rnd = mulberry32(20260914);
  const contours: string[] = [];
  const fine: string[] = [];
  const dots: Dot[] = [];

  // Wavy horizontal contour bands -- a topographic feel rather than clean
  // latitude ellipses.
  const bandCount = 16;
  for (let i = 0; i < bandCount; i++) {
    const t = (i + 0.5) / bandCount;
    const dy = (t - 0.5) * 2 * R * 0.94;
    const half = Math.sqrt(Math.max(R * R - dy * dy, 0)) * (0.92 + rnd() * 0.06);
    const y = CY + dy;
    const segs = 6 + Math.floor(rnd() * 3);
    let d = `M ${(CX - half).toFixed(1)} ${y.toFixed(1)}`;
    for (let s = 1; s <= segs; s++) {
      const x = CX - half + (2 * half * s) / segs;
      const prevX = CX - half + (2 * half * (s - 1)) / segs;
      const midX = (x + prevX) / 2;
      const wob = (rnd() - 0.5) * 9;
      d += ` Q ${midX.toFixed(1)} ${(y + wob).toFixed(1)} ${x.toFixed(1)} ${(y + (rnd() - 0.5) * 5).toFixed(1)}`;
    }
    contours.push(d);
  }

  // Fainter longitude-like sweeps -- capped well short of the true radius so
  // no single arc traces the sphere's outer edge.
  const longCount = 10;
  for (let i = 0; i < longCount; i++) {
    const angle = (i / (longCount - 1)) * Math.PI;
    const rx = R * (0.22 + 0.56 * Math.abs(Math.sin(angle)));
    fine.push(`M ${CX} ${CY - R} A ${rx.toFixed(1)} ${R} 0 0 1 ${CX} ${CY + R}`);
  }

  // Dense point field with radial fade toward the rim and toward the poles,
  // plus varied brightness so it doesn't read as a flat grid.
  const target = 280;
  let tries = 0;
  while (dots.length < target && tries < target * 10) {
    tries++;
    const a = rnd() * Math.PI * 2;
    const rr = R * Math.sqrt(rnd());
    const x = CX + Math.cos(a) * rr;
    const y = CY + Math.sin(a) * rr * 0.98;
    const edgeFalloff = Math.pow(rr / R, 3);
    const poleFalloff = Math.pow(Math.abs(y - CY) / R, 2);
    if (rnd() < edgeFalloff * 0.55 + poleFalloff * 0.3) continue;

    const tier = rnd();
    const bright = tier > 0.9;
    const mid = tier > 0.55;
    dots.push({
      x,
      y,
      r: bright ? 1.3 + rnd() * 0.6 : mid ? 0.9 + rnd() * 0.5 : 0.5 + rnd() * 0.4,
      o: bright ? 0.45 + rnd() * 0.15 : mid ? 0.3 + rnd() * 0.12 : 0.16 + rnd() * 0.12,
    });
  }

  return { contours, fine, dots };
}

const FIELD = buildGlobeField();

export function FooterNetworkGraphic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" fill="none">
      <g stroke="rgba(195,165,109,0.12)" strokeWidth="0.6">
        {FIELD.fine.map((d, i) => (
          <path key={`f${i}`} d={d} />
        ))}
      </g>
      <g stroke="rgba(195,165,109,0.2)" strokeWidth="0.6">
        {FIELD.contours.map((d, i) => (
          <path key={`c${i}`} d={d} />
        ))}
      </g>
      <g fill="#d7be8c">
        {FIELD.dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={p.o} />
        ))}
      </g>
    </svg>
  );
}
