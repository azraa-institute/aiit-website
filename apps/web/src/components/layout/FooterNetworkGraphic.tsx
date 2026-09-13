/**
 * A large, faint wireframe globe for the footer's "global reach" corner --
 * concentric ellipses standing in for latitude/longitude lines (the classic
 * flat technique for a wireframe sphere), with a scatter of node dots along
 * a few of them. Reads clearly as "earth", unlike a flat scattered network.
 * Pure static SVG, sized and clipped by the parent (footer.css) so it can
 * bleed off the right edge the way the reference does.
 */
export function FooterNetworkGraphic({ className }: { className?: string }) {
  const line = 'rgba(216,201,176,0.32)';
  const lineFaint = 'rgba(216,201,176,0.16)';

  return (
    <svg className={className} viewBox="0 0 520 520" aria-hidden="true" fill="none">
      <circle cx="260" cy="260" r="240" stroke={line} strokeWidth="1" />

      {/* latitude lines */}
      <ellipse cx="260" cy="260" rx="240" ry="150" stroke={lineFaint} strokeWidth="1" />
      <ellipse cx="260" cy="260" rx="240" ry="80" stroke={line} strokeWidth="1" />
      <ellipse cx="260" cy="260" rx="240" ry="20" stroke={lineFaint} strokeWidth="1" />

      {/* longitude lines */}
      <ellipse cx="260" cy="260" rx="150" ry="240" stroke={lineFaint} strokeWidth="1" />
      <ellipse cx="260" cy="260" rx="80" ry="240" stroke={line} strokeWidth="1" />
      <ellipse cx="260" cy="260" rx="20" ry="240" stroke={lineFaint} strokeWidth="1" />

      <g fill="#d8c9b0">
        <circle cx="260" cy="20" r="2.4" />
        <circle cx="410" cy="90" r="2" />
        <circle cx="500" cy="260" r="3" />
        <circle cx="420" cy="410" r="2.2" />
        <circle cx="180" cy="480" r="2" />
        <circle cx="60" cy="330" r="2.6" />
        <circle cx="110" cy="140" r="2" />
        <circle cx="330" cy="160" r="2.2" />
      </g>
    </svg>
  );
}
