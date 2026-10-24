import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
  /** Optional at every level -- a top-level entry, a group header, or a sub-item under an open group (admin's own groups simply don't pass one, so they render exactly as before). */
  icon?: ReactNode;
}

/** A collapsible section header with its own sub-links -- for a portal with enough entries (admin) that a flat list reads as a wall of links. */
export interface StaffNavGroup {
  label: string;
  icon?: ReactNode;
  items: StaffNavEntry[];
}

export type StaffNavItem = StaffNavEntry | StaffNavGroup;

function isNavGroup(item: StaffNavItem): item is StaffNavGroup {
  return 'items' in item;
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
  nav: StaffNavItem[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, session } = useAuth();
  const me = useMe();
  const [open, setOpen] = useState(false);
  // Explicit per-group open/closed overrides -- undefined means "not
  // manually toggled yet", which falls back to "open if it contains the
  // current route" below, so navigating straight to a sub-page (e.g. a
  // bookmark or a Link from elsewhere) always shows that group expanded.
  const [groupOverride, setGroupOverride] = useState<Record<string, boolean>>({});
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
    signOut().then(() => navigate(tone === 'affiliate' ? '/affiliate/login' : '/staff/login'));
  }

  function groupContainsActiveRoute(group: StaffNavGroup): boolean {
    return group.items.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  }

  function isGroupOpen(group: StaffNavGroup): boolean {
    return groupOverride[group.label] ?? groupContainsActiveRoute(group);
  }

  function toggleGroup(group: StaffNavGroup) {
    setGroupOverride((prev) => ({ ...prev, [group.label]: !isGroupOpen(group) }));
  }

  return (
    <div className={cn('shell', `shell--${tone}`, open && 'is-open', collapsed && 'is-collapsed')}>
      <Seo title={portal} path={tone === 'admin' ? '/admin' : tone === 'affiliate' ? '/affiliate-portal' : '/instructor'} noindex />

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
        <p className="shell__portal">
          <span className="shell__portal-dash" aria-hidden="true" />
          {portal}
        </p>

        <nav className="shell__nav" aria-label={`${portal} sections`}>
          <ul role="list">
            {nav.map((item) =>
              isNavGroup(item) ? (
                <li key={item.label} className="shell__nav-group">
                  <button
                    type="button"
                    className={cn('shell__group-toggle', isGroupOpen(item) && 'is-open')}
                    aria-expanded={isGroupOpen(item)}
                    onClick={() => toggleGroup(item)}
                  >
                    {item.icon ? <span className="shell__link-icon">{item.icon}</span> : null}
                    <span className="shell__link-label">{item.label}</span>
                    <svg className="shell__group-chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                      <path d="M2.5 3.5 5 6l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isGroupOpen(item) ? (
                    <ul role="list" className="shell__subnav">
                      {item.items.map((sub) => (
                        <li key={sub.to}>
                          <NavLink to={sub.to} end={sub.end} className={({ isActive }) => cn('shell__link', isActive && 'is-active')}>
                            {sub.icon ? <span className="shell__link-icon">{sub.icon}</span> : null}
                            <span className="shell__link-label">{sub.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ) : (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={({ isActive }) => cn('shell__link', 'shell__link--top', isActive && 'is-active')}>
                    {item.icon ? <span className="shell__link-icon">{item.icon}</span> : null}
                    <span className="shell__link-label">{item.label}</span>
                  </NavLink>
                </li>
              ),
            )}
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
