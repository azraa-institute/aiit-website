import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { useAccountMenu } from '@/lib/useAccountMenu';

/**
 * Replaces the header's "Login" link once a session exists -- an avatar
 * that opens a small menu (View profile / Return to Dashboard or Resources
 * / Sign out), so a learner who followed "Browse courses" or a resources
 * link out of the portal isn't stranded on the public site with no way
 * back except the browser's back button.
 */
export function HeaderAccount() {
  const { authenticated, name, photoUrl, returnTarget, returnLabel, signOut } = useAccountMenu();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!authenticated) {
    return (
      <Link to="/login" className="site-header__login">
        Login
      </Link>
    );
  }

  return (
    <div className="site-header__account" ref={wrapRef}>
      <button
        type="button"
        className="site-header__account-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={name} photoUrl={photoUrl} size="sm" />
      </button>

      {open && (
        <div className="site-header__account-menu" role="menu">
          <Link
            to="/portal/profile"
            role="menuitem"
            className="site-header__account-item"
            onClick={() => setOpen(false)}
          >
            View profile
          </Link>
          <Link
            to={returnTarget}
            role="menuitem"
            className="site-header__account-item"
            onClick={() => setOpen(false)}
          >
            {returnLabel}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="site-header__account-item site-header__account-item--danger"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
