// Quill -- AIIT's course-advice assistant. Ink-circle avatar with a brass
// pencil/nib mark (ties to the editorial identity -- --font-display is a
// serif, this is the one place that identity gets a face) and a small solid
// brass "spark" dot standing in for an online/AI-active indicator. The
// pencil path is Material Design's standard "edit" glyph (well-tested,
// recognizable), nested the same way BrandChip in PaymentMethodPicker crops
// a 24x24 icon inside a smaller round badge.
export function QuillAvatar({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="18" fill="var(--ink)" />
      <svg x="9" y="9" width="18" height="18" viewBox="0 0 24 24">
        <path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
          fill="var(--brass-tint)"
        />
      </svg>
      <circle cx="29" cy="29" r="5" fill="var(--brass)" stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  );
}
