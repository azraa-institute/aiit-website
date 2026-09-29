/**
 * A "panel with a rail" glyph -- the layout itself, not just an arrow -- used
 * for every sidebar collapse/expand control (student portal rail, admin and
 * instructor shells). `open` points the small chevron toward where the rail
 * will go: left to tuck it away, right to bring it back.
 */
export function SidebarToggleIcon({ open }: { open: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.25" y="3.75" width="15.5" height="12.5" rx="2.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 3.75v12.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d={open ? 'M6 7.5 3.6 10 6 12.5' : 'M4.5 7.5 6.9 10 4.5 12.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
