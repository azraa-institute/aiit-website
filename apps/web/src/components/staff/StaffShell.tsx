import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/AuthContext';
import { useMe } from '@/lib/me';
import { Logo } from '@/components/layout/Logo';
import './staff-shell.css';

export interface StaffNavEntry {
  to: string;
  label: string;
  end?: boolean;
}

/**
 * The frame for the admin and instructor portals: a sidebar + content area.
 * The two portals share this structure but not their look (`tone`) -- each is
 * visibly a different place from the other and from the student portal.
 */
export function StaffShell({
  portal,
  tone,
  nav,
}: {
  /** Shown under the logo, e.g. "Administration" or "Instructor portal". */
  portal: string;
  tone: 'admin' | 'instructor';
  nav: StaffNavEntry[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, session } = useAuth();
  const me = useMe();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  const name = me.status === 'ready' ? me.me.name : null;
  const email = session?.user.email;

  function handleSignOut() {
    signOut().then(() => navigate('/staff/login'));
  }

  return (
    <div className={cn('shell', `shell--${tone}`, open && 'is-open')}>
      <Seo title={portal} path={tone === 'admin' ? '/admin' : '/instructor'} noindex />

      <header className="shell__topbar">
        <button type="button" className="shell__menu" aria-expanded={open} aria-controls="shell-side" onClick={() => setOpen((o) => !o)}>
          <span className="visually-hidden">Menu</span>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <span className="shell__topbar-title">{portal}</span>
      </header>

      <aside id="shell-side" className="shell__side" aria-label={portal}>
        <Link to="/" className="shell__brand" aria-label="AIIT home">
          <Logo variant="light" className="shell__logo" />
        </Link>
        <p className="shell__portal">{portal}</p>

        <nav className="shell__nav" aria-label={`${portal} sections`}>
          <ul role="list">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => cn('shell__link', isActive && 'is-active')}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shell__user">
          <p className="shell__user-name">{name ?? email ?? 'Signed in'}</p>
          {name && email ? <p className="shell__user-email">{email}</p> : null}
          <button type="button" className="shell__signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <button type="button" className="shell__scrim" aria-label="Close menu" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />

      <main className="shell__main" id="staff-main">
        <div className="shell__view">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
