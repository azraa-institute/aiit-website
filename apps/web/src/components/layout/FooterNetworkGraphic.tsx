/**
 * A large digital-earth sphere for the footer's institutional strip: real
 * 3D orthographic projection (a tilted sphere, latitude/longitude great
 * circles, and a uniformly-sampled surface point cloud), not a flat wavy
 * grid -- the tilt is what makes the lat/long lines read as genuine
 * ellipse-arc curvature instead of nearly-straight horizontal bands.
 * Deterministic (fixed seed) so it's computed once, not per render. Pure
 * SVG, no image assets, no animation.
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

const SIZE = 680;
const CX = 340;
const CY = 340;
const R = 320;
/** Tilt around the horizontal axis -- without this, latitude/longitude
 * circles viewed face-on project as near-straight lines (the "flat grid"
 * look this replaces); tilted, they project as genuine ellipse arcs. */
const TILT = (26 * Math.PI) / 180;
const COS_T = Math.cos(TILT);
const SIN_T = Math.sin(TILT);

interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** Sphere point at (latitude phi, longitude lambda), both in radians, after
 * the fixed tilt rotation -- z > 0 is the visible (front) hemisphere. */
function project(phi: number, lambda: number): Point3 {
  const x0 = Math.cos(phi) * Math.cos(lambda);
  const y0 = Math.sin(phi);
  const z0 = Math.cos(phi) * Math.sin(lambda);
  const y1 = y0 * COS_T - z0 * SIN_T;
  const z1 = y0 * SIN_T + z0 * COS_T;
  return { x: x0 * R, y: y1 * R, z: z1 * R };
}

interface Dot {
  x: number;
  y: number;
  r: number;
  o: number;
}

interface GlobeField {
  latitudes: string[];
  longitudes: string[];
  dots: Dot[];
}

/** Builds one ring (fixed phi, sweeping lambda, or fixed lambda sweeping
 * phi) as one or more front-hemisphere-only path fragments -- broken at
 * the terminator (z crossing zero) so the path never draws through the
 * back of the sphere. */
function ringPaths(steps: number, at: (t: number) => Point3): string[] {
  const pts: Point3[] = [];
  for (let i = 0; i <= steps; i++) pts.push(at((i / steps) * Math.PI * 2));

  const paths: Point3[][] = [];
  let current: Point3[] = [];
  for (const p of pts) {
    if (p.z >= -R * 0.02) {
      current.push(p);
    } else if (current.length > 1) {
      paths.push(current);
      current = [];
    } else {
      current = [];
    }
  }
  if (current.length > 1) paths.push(current);

  return paths
    .filter((seg) => seg.length > 1)
    .map((seg) => {
      const d = seg
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(CX + p.x).toFixed(1)} ${(CY - p.y).toFixed(1)}`)
        .join(' ');
      return d;
    });
}

function buildGlobeField(): GlobeField {
  const rnd = mulberry32(20260914);
  const latitudes: string[] = [];
  const longitudes: string[] = [];
  const dots: Dot[] = [];

  // Latitude rings -- circles of constant phi, swept across longitude.
  const latSteps = 10;
  for (let i = 1; i < latSteps; i++) {
    const phi = (i / latSteps - 0.5) * Math.PI * 0.94;
    latitudes.push(...ringPaths(72, (lambda) => project(phi, lambda)));
  }

  // Longitude rings -- meridians, swept across latitude.
  const lonSteps = 14;
  for (let i = 0; i < lonSteps; i++) {
    const lambda = (i / lonSteps) * Math.PI * 2;
    longitudes.push(...ringPaths(72, (phi) => project((phi / (Math.PI * 2)) * Math.PI - Math.PI / 2, lambda)));
  }

  // Uniformly-sampled surface point cloud (area-uniform, not a lat/long
  // grid sample, so density reads as organic rather than banded).
  const target = 950;
  for (let i = 0; i < target; i++) {
    const lambda = rnd() * Math.PI * 2;
    const phi = Math.asin(2 * rnd() - 1);
    const p = project(phi, lambda);
    if (p.z < -R * 0.16) continue; // just past the terminator -- skip

    const front = Math.min(Math.max((p.z / R + 0.16) / 1.16, 0), 1); // 0 (edge) .. 1 (facing)
    const edgeR = Math.hypot(p.x, p.y) / R;
    const edgeFalloff = Math.pow(edgeR, 4);
    if (rnd() < edgeFalloff * 0.4) continue;

    const tier = rnd();
    const bright = tier > 0.94;
    const mid = tier > 0.6;
    const brightness = 0.35 + front * 0.65;
    dots.push({
      x: p.x,
      y: p.y,
      r: bright ? 1.4 + rnd() * 0.7 : mid ? 0.9 + rnd() * 0.5 : 0.55 + rnd() * 0.4,
      o: (bright ? 0.5 + rnd() * 0.18 : mid ? 0.32 + rnd() * 0.14 : 0.18 + rnd() * 0.12) * brightness,
    });
  }

  return { latitudes, longitudes, dots };
}

const FIELD = buildGlobeField();

export function FooterNetworkGraphic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" fill="none">
      <g stroke="rgba(190,157,99,0.16)" strokeWidth="0.75">
        {FIELD.longitudes.map((d, i) => (
          <path key={`lon${i}`} d={d} />
        ))}
      </g>
      <g stroke="rgba(190,157,99,0.26)" strokeWidth="0.9">
        {FIELD.latitudes.map((d, i) => (
          <path key={`lat${i}`} d={d} />
        ))}
      </g>
      <g fill="#d7bb84">
        {FIELD.dots.map((p, i) => (
          <circle key={i} cx={CX + p.x} cy={CY - p.y} r={p.r} opacity={p.o} />
        ))}
      </g>
    </svg>
  );
}
