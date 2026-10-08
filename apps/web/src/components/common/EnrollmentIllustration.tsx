/**
 * Flat-style graduation cap + ribboned diploma, in the site's own ink/brass
 * palette -- a vector recreation of the reference mockup's placement and
 * subject (not its photorealistic rendering, which isn't an asset this
 * codebase has and isn't something to generate fresh).
 */
export function EnrollmentIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" className={className} aria-hidden="true">
      {/* diploma scroll */}
      <g>
        <rect x="18" y="108" width="108" height="30" rx="15" fill="var(--surface)" stroke="var(--brass-deep)" strokeWidth="2" />
        <rect x="20" y="106" width="20" height="34" rx="10" fill="var(--ivory-deep)" stroke="var(--brass-deep)" strokeWidth="2" />
        <rect x="104" y="106" width="20" height="34" rx="10" fill="var(--ivory-deep)" stroke="var(--brass-deep)" strokeWidth="2" />
        <path d="M60 123h44" stroke="var(--brass-deep)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        {/* ribbon bow */}
        <path d="M68 113 58 128l14-4 2 10 2-10 14 4-10-15Z" fill="var(--brass)" stroke="var(--brass-deep)" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="76" cy="118" r="4" fill="var(--brass-deep)" />
      </g>

      {/* mortarboard cap */}
      <g>
        <path d="M142 56 94 76l48 20 48-20-48-20Z" fill="var(--ink)" />
        <path d="M118 84v22c0 7 11 13 24 13s24-6 24-13V84" fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinejoin="round" />
        <circle cx="142" cy="76" r="4.5" fill="var(--brass)" />
        <path d="M142 76 182 61" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" />
        <path d="M182 61v26c0 4-3 7-6 9" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" />
        <path d="M176 96c-2 4-2 9 2 13" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
