/**
 * The AIIT portal loading treatment — a constellation-inspired mark, not
 * a spinner. Three nodes illuminate in sequence along a thin line. Fast,
 * subtle; collapses to a static state under prefers-reduced-motion
 * (portal.css). Used as the Suspense fallback for portal sub-routes.
 */
export function PortalLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="portal-loader" role="status" aria-label={label}>
      <span className="portal-loader__line" aria-hidden="true">
        <span className="portal-loader__node" />
        <span className="portal-loader__node" />
        <span className="portal-loader__node" />
      </span>
    </div>
  );
}
