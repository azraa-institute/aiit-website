/**
 * A compact "global network" motif for the footer -- a loose circular
 * scatter of nodes with faint connecting lines, reusing the exact visual
 * language PortalAtmosphere.tsx already established for "network/global"
 * elsewhere in the product, just recomposed as a standalone graphic instead
 * of a full-bleed background. Static SVG, no animation.
 */
export function FooterNetworkGraphic({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 220"
      aria-hidden="true"
      fill="none"
    >
      <g stroke="rgba(216,201,176,0.14)" strokeWidth="1">
        <path d="M20 30 H280 M20 70 H280 M20 110 H280 M20 150 H280 M20 190 H280" />
      </g>
      <g stroke="rgba(216,201,176,0.45)" strokeWidth="1" strokeLinecap="round">
        <path d="M60 60 C 110 30, 160 40, 190 20" />
        <path d="M190 20 C 210 60, 230 80, 260 70" />
        <path d="M60 60 C 70 100, 90 130, 120 150" />
        <path d="M120 150 C 160 170, 190 160, 220 130" />
        <path d="M220 130 C 240 110, 250 90, 260 70" />
        <path d="M120 150 C 100 180, 90 195, 70 205" />
      </g>
      <g fill="#d8c9b0">
        <circle cx="60" cy="60" r="2.6" />
        <circle cx="190" cy="20" r="2.2" />
        <circle cx="260" cy="70" r="3.2" />
        <circle cx="120" cy="150" r="3" />
        <circle cx="220" cy="130" r="2.2" />
        <circle cx="70" cy="205" r="2.2" />
      </g>
    </svg>
  );
}
