/**
 * A minimal two-line menu glyph -- used for every sidebar collapse/expand
 * control (student portal rail, admin/instructor/affiliate shells). The
 * accent dot sits at the end of the short bar on the side the rail will go:
 * right when open (collapsing tucks it away left), left when collapsed
 * (expanding brings it back from the left).
 */
export function SidebarToggleIcon({ open }: { open: boolean }) {
  const dotX = open ? 14.5 : 5.5;
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={open ? 'M3.5 7.3h8' : 'M8.5 7.3h8'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 12.7h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={dotX} cy="7.3" r="1.35" fill="var(--shell-accent, var(--brass-tint))" />
    </svg>
  );
}
