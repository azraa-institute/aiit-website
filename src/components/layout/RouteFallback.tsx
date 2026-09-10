import { Logo } from './Logo';
import './route-fallback.css';

/** Calm, branded loading state shown while a route chunk loads. */
export function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="Loading">
      <Logo variant="dark" />
      <span className="route-fallback__bar" aria-hidden="true" />
    </div>
  );
}
