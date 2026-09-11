import { useMemo } from 'react';
import { assetUrl } from '@/lib/assetUrl';
import './plate.css';

export type Motif =
  | 'lattice'
  | 'flow'
  | 'strata'
  | 'field'
  | 'horizon'
  | 'depth'
  | 'mesh'
  | 'signal';

interface PlateProps {
  /** A motif keyword, OR a real image URL (http(s):// or /path) to use instead. */
  source: string;
  /** Stable seed — a slug — so the art is deterministic per item. */
  seed: string;
  motif?: Motif;
  ratio?: number;
  className?: string;
  /** 'ink' renders light lines on dark; 'paper' renders dark lines on light. */
  tone?: 'ink' | 'paper';
  alt?: string;
  /**
   * How a real image fills the frame.
   * 'cover' (default) crops to the `ratio` box; 'natural' drops the fixed
   * ratio and shows the whole image at its own aspect. Ignored for motif art.
   */
  fit?: 'cover' | 'natural';
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isUrl = (s: string) => /^(https?:)?\/\//.test(s) || s.startsWith('/');

/**
 * "Editorial plate" — restrained procedural line-art (fine lines, architectural
 * grids) generated deterministically from `seed`. Pass a real image URL as
 * `source` to render that instead, with no change at the call site.
 */
export function Plate({
  source,
  seed,
  motif = 'lattice',
  ratio = 4 / 3,
  className,
  tone = 'paper',
  alt = '',
  fit = 'cover',
}: PlateProps) {
  const url = isUrl(source) ? source : null;
  const resolvedMotif = (isUrl(source) ? motif : (source as Motif)) || motif;

  const paths = useMemo(
    () => buildMotif(resolvedMotif, hash(`${seed}:${resolvedMotif}`)),
    [resolvedMotif, seed],
  );

  if (url) {
    const natural = fit === 'natural';
    return (
      <div
        className={`plate${natural ? ' plate--natural' : ''} ${className ?? ''}`}
        style={natural ? undefined : { aspectRatio: String(ratio) }}
      >
        <img src={assetUrl(url)} alt={alt} loading="lazy" decoding="async" />
      </div>
    );
  }

  const stroke = tone === 'ink' ? 'rgba(244,239,231,0.42)' : 'rgba(20,17,15,0.3)';
  const strokeFaint = tone === 'ink' ? 'rgba(244,239,231,0.12)' : 'rgba(20,17,15,0.09)';
  const accent = tone === 'ink' ? 'rgba(216,201,176,0.8)' : 'rgba(154,123,79,0.65)';
  const fieldBg = tone === 'ink' ? '#191512' : '#efe8db';

  return (
    <div
      className={`plate plate--art plate--${resolvedMotif} ${className ?? ''}`}
      style={{ aspectRatio: String(ratio), background: fieldBg }}
      role={alt ? 'img' : 'presentation'}
      aria-label={alt || undefined}
    >
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden={alt ? undefined : true}>
        <g stroke={strokeFaint} strokeWidth="1" fill="none">
          {paths.grid.map((d, i) => (
            <path key={`g${i}`} d={d} />
          ))}
        </g>
        <g stroke={stroke} strokeWidth="1.25" fill="none" strokeLinecap="round">
          {paths.lines.map((d, i) => (
            <path key={`l${i}`} d={d} />
          ))}
        </g>
        <g fill={accent} stroke="none">
          {paths.dots.map((c, i) => (
            <circle key={`d${i}`} cx={c[0]} cy={c[1]} r={c[2]} />
          ))}
        </g>
        {paths.accentLine && (
          <path d={paths.accentLine} stroke={accent} strokeWidth="1.5" fill="none" />
        )}
      </svg>
    </div>
  );
}

interface MotifPaths {
  grid: string[];
  lines: string[];
  dots: [number, number, number][];
  accentLine?: string;
}

function buildMotif(motif: Motif, seed: number): MotifPaths {
  const rnd = mulberry32(seed);
  const grid: string[] = [];
  const lines: string[] = [];
  const dots: [number, number, number][] = [];
  let accentLine: string | undefined;

  // Shared architectural grid, drawn under every motif.
  for (let x = 0; x <= 400; x += 50) grid.push(`M${x} 0 V300`);
  for (let y = 0; y <= 300; y += 50) grid.push(`M0 ${y} H400`);

  switch (motif) {
    case 'lattice': {
      const nodes: [number, number][] = Array.from({ length: 10 }, () => [
        30 + rnd() * 340,
        30 + rnd() * 240,
      ]);
      nodes.forEach((n, i) => {
        dots.push([n[0], n[1], 2.2]);
        const j = (i + 1 + Math.floor(rnd() * 3)) % nodes.length;
        lines.push(`M${n[0]} ${n[1]} L${nodes[j][0]} ${nodes[j][1]}`);
      });
      accentLine = `M${nodes[0][0]} ${nodes[0][1]} L${nodes[4][0]} ${nodes[4][1]} L${nodes[7][0]} ${nodes[7][1]}`;
      break;
    }
    case 'flow': {
      for (let k = 0; k < 6; k++) {
        const y = 40 + k * 40 + rnd() * 12;
        const amp = 16 + rnd() * 26;
        lines.push(
          `M0 ${y} C 100 ${y - amp}, 160 ${y + amp}, 260 ${y} S 400 ${y - amp}, 400 ${y}`,
        );
      }
      accentLine = `M0 150 C 120 90, 200 210, 400 140`;
      break;
    }
    case 'strata': {
      let y = 30;
      for (let k = 0; k < 7; k++) {
        y += 24 + rnd() * 22;
        const tilt = (rnd() - 0.5) * 40;
        lines.push(`M0 ${y} L400 ${y + tilt}`);
      }
      dots.push([200 + (rnd() - 0.5) * 120, 150, 3]);
      break;
    }
    case 'field': {
      for (let gx = 40; gx < 400; gx += 44) {
        for (let gy = 40; gy < 300; gy += 44) {
          const r = 1 + rnd() * 2.6;
          dots.push([gx + (rnd() - 0.5) * 10, gy + (rnd() - 0.5) * 10, r]);
        }
      }
      accentLine = `M40 260 L360 40`;
      break;
    }
    case 'horizon': {
      for (let k = 0; k < 5; k++) {
        const y = 150 - k * 8;
        const scale = 1 - k * 0.14;
        lines.push(
          `M${200 - 180 * scale} ${y} Q 200 ${y - 40 * scale} ${200 + 180 * scale} ${y}`,
        );
      }
      accentLine = `M60 240 Q 200 120 340 240`;
      dots.push([200, 110, 3]);
      break;
    }
    case 'depth': {
      for (let k = 0; k < 5; k++) {
        const inset = k * 26;
        lines.push(
          `M${40 + inset} ${30 + inset} H${360 - inset} V${270 - inset} H${40 + inset} Z`,
        );
      }
      accentLine = `M40 150 H360`;
      break;
    }
    case 'mesh': {
      const cols = 6;
      const rows = 4;
      const pts: [number, number][][] = [];
      for (let r = 0; r <= rows; r++) {
        const row: [number, number][] = [];
        for (let c = 0; c <= cols; c++) {
          row.push([
            (400 / cols) * c + (rnd() - 0.5) * 14,
            (300 / rows) * r + (rnd() - 0.5) * 14,
          ]);
        }
        pts.push(row);
      }
      pts.forEach((row, r) =>
        row.forEach((p, c) => {
          if (c < cols) lines.push(`M${p[0]} ${p[1]} L${row[c + 1][0]} ${row[c + 1][1]}`);
          if (r < rows) lines.push(`M${p[0]} ${p[1]} L${pts[r + 1][c][0]} ${pts[r + 1][c][1]}`);
        }),
      );
      break;
    }
    case 'signal': {
      let x = 0;
      let y = 150;
      let d = `M0 150`;
      while (x < 400) {
        x += 12 + rnd() * 26;
        y = 150 + (rnd() - 0.5) * 150;
        d += ` L${x} ${y}`;
      }
      lines.push(d);
      accentLine = `M0 150 H400`;
      for (let k = 0; k < 5; k++) dots.push([40 + k * 80, 150 + (rnd() - 0.5) * 80, 2.4]);
      break;
    }
  }

  return { grid, lines, dots, accentLine };
}
