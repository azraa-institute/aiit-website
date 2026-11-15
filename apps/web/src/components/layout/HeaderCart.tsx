import { Link } from 'react-router-dom';
import { useAccountMenu } from '@/lib/useAccountMenu';
import { useCart } from '@/pages/portal/cartData';

/**
 * A persistent cart icon in the public header, next to the account control
 * -- only for a signed-in learner (the cart has nowhere to go for any other
 * role, see useAccountMenu's isLearner). Links straight to the dashboard,
 * where the actual cart widget lives, rather than a dedicated /cart page.
 */
export function HeaderCart() {
  const { isLearner } = useAccountMenu();
  const cart = useCart({ enabled: isLearner });
  if (!isLearner) return null;

  const count = cart.status === 'ready' ? cart.items.length : 0;

  return (
    <Link to="/portal" className="site-header__cart" aria-label={`Your cart${count > 0 ? `, ${count} course${count === 1 ? '' : 's'}` : ''}`}>
      <svg width="19" height="17" viewBox="0 0 19 17" aria-hidden="true">
        <path d="M1 1h2l1.6 9.6a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L17.5 4.5H4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="15" r="1.1" fill="currentColor" />
        <circle cx="13.5" cy="15" r="1.1" fill="currentColor" />
      </svg>
      {count > 0 ? <span className="site-header__cart-count">{count}</span> : null}
    </Link>
  );
}
