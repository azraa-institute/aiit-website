import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/AuthContext';
import { useMe } from '@/lib/me';
import { useSessionHeartbeat } from '@/lib/useSessionHeartbeat';
import { usePersistedBoolean } from '@/lib/usePersistedBoolean';
import { Logo } from '@/components/layout/Logo';
import { SidebarToggleIcon } from '@/components/common/SidebarToggleIcon';
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
  tone: 'admin' | 'instructor' | 'affiliate';
  nav: StaffNavEntry[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, session } = useAuth();
  const me = useMe();
  const [open, setOpen] = useState(false);
  // Desktop-only, same idea and mechanism as the student portal's rail --
  // see PortalLayout.tsx. Key is per-tone so an admin and an instructor
  // signed in on the same browser don't share one preference.
  const [collapsed, setCollapsed] = usePersistedBoolean(`aiit-${tone}-rail-collapsed`);
  useSessionHeartbeat();

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  const name = me.status === 'ready' ? me.me.name : null;
  const email = session?.user.email;

  // Affiliates are regular accounts (RequireAuth's default /login gate), not
  // staff -- only admin/instructor sign back in at /staff/login.
  function handleSignOut() {
    signOut().then(() => navigate(tone === 'affiliate' ? '/login' : '/staff/login'));
  }

  return (
    <div className={cn('shell', `shell--${tone}`, open && 'is-open', collapsed && 'is-collapsed')}>
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
        <div className="shell__brand-row">
          <Link to="/" className="shell__brand" aria-label="AIIT home">
            <Logo variant="light" className="shell__logo" />
          </Link>
          <button type="button" className="shell__collapse" title="Minimise navigation" onClick={() => setCollapsed(true)}>
            <span className="visually-hidden">Minimise navigation</span>
            <SidebarToggleIcon open />
          </button>
        </div>
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

      {/* Desktop only (see staff-shell.css) -- brings the collapsed sidebar back. */}
      <button type="button" className="shell__expand" title="Show navigation" onClick={() => setCollapsed(false)}>
        <span className="visually-hidden">Show navigation</span>
        <SidebarToggleIcon open={false} />
      </button>

      <main className="shell__main" id="staff-main">
        <div className="shell__view">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
