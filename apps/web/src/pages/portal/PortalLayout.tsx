import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/AuthContext';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { Logo } from '@/components/layout/Logo';
import { useLearner, greetingName } from './learnerData';
import { PortalAtmosphere } from './PortalAtmosphere';
import { PortalLoader } from './PortalLoader';
import './portal.css';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  group: 'primary' | 'study' | 'account';
}

const NAV: NavItem[] = [
  { to: '/portal', label: 'Dashboard', end: true, group: 'primary' },
  { to: '/portal/courses', label: 'My courses', group: 'primary' },
  { to: '/portal/certificates', label: 'Certificates', group: 'primary' },
  { to: '/portal/assignments', label: 'Assignments', group: 'primary' },
  { to: '/portal/resources', label: 'Learning resources', group: 'study' },
  { to: '/portal/webinars', label: 'Webinar registrations', group: 'study' },
  { to: '/portal/notifications', label: 'Notifications', group: 'study' },
  { to: '/portal/profile', label: 'Profile', group: 'account' },
  { to: '/portal/settings', label: 'Account settings', group: 'account' },
];

const GROUP_LABEL: Record<NavItem['group'], string> = {
  primary: 'Learning',
  study: 'Around your courses',
  account: 'Account',
};

/** Core destinations for the phone bottom nav, in priority order. */
const BOTTOM_NAV = [
  { to: '/portal', label: 'Home', end: true, icon: 'home' as const },
  { to: '/portal/courses', label: 'Courses', icon: 'courses' as const },
  { to: '/portal/certificates', label: 'Certificates', icon: 'award' as const },
  { to: '/portal/assignments', label: 'Tasks', icon: 'tasks' as const },
];

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const learnerState = useLearner();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuCloseRef = useRef<HTMLButtonElement>(null);

  useLockBodyScroll(menuOpen);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Focus management + Escape for the mobile nav.
  useEffect(() => {
    if (!menuOpen) return;
    menuCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const learner = learnerState.learner;
  const unread = learner?.notifications.filter((n) => !n.read).length ?? 0;
  const firstName = learner ? greetingName(learner) : null;
  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const sectionLabel = current?.label ?? 'Portal';

  function handleSignOut() {
    signOut().then(() => navigate('/login'));
  }

  return (
    <div className={cn('portal', menuOpen && 'portal--menu-open')}>
      <Seo title="Learner portal" path="/portal" noindex />
      <PortalAtmosphere />

      <a className="portal__skip skip-link" href="#portal-main">
        Skip to content
      </a>

      {/* Navigation rail — the same markup is the desktop rail and the
          mobile slide-out panel; CSS switches presentation. */}
      <aside id="portal-rail" className="portal-rail on-ink" aria-label="Learner portal">
        <div className="portal-rail__top">
          <Link to="/" className="portal-rail__brand">
            <Logo variant="light" className="portal-rail__logo" />
            <span className="portal-rail__brand-sub">Learner portal</span>
          </Link>
          <button
            type="button"
            className="portal-rail__close"
            ref={menuCloseRef}
            onClick={() => setMenuOpen(false)}
          >
            <span className="visually-hidden">Close menu</span>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="m4 4 10 10M14 4 4 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <nav className="portal-rail__nav" aria-label="Portal sections">
          {(['primary', 'study', 'account'] as const).map((group) => (
            <div className="portal-rail__group" key={group}>
              <p className="portal-rail__group-label">{GROUP_LABEL[group]}</p>
              <ul role="list">
                {NAV.filter((n) => n.group === group).map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => cn('portal-rail__link', isActive && 'is-active')}
                    >
                      <span className="portal-rail__link-line" aria-hidden="true" />
                      <span className="portal-rail__link-label">{item.label}</span>
                      {item.to === '/portal/notifications' && unread > 0 ? (
                        <span className="portal-rail__badge" aria-label={`${unread} unread`}>
                          {unread}
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <button type="button" className="portal-rail__signout" onClick={handleSignOut}>
          Sign out
        </button>
      </aside>

      <button
        type="button"
        className="portal__scrim"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <div className="portal__main">
        <header className="portal-topbar">
          <button
            type="button"
            className="portal-topbar__menu"
            aria-expanded={menuOpen}
            aria-controls="portal-rail"
            onClick={() => setMenuOpen(true)}
          >
            <span className="visually-hidden">Open menu</span>
            <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
              <path d="M0 1h20M0 7h20M0 13h20" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          <p className="portal-topbar__where">
            <Link to="/portal" className="portal-topbar__where-root" aria-label="AIIT learner portal">
              <Logo variant="dark" className="portal-topbar__logo" />
            </Link>
            <span aria-hidden="true" className="portal-topbar__where-sep">
              /
            </span>
            <span className="portal-topbar__where-section">{sectionLabel}</span>
          </p>

          <div className="portal-topbar__tools">
            <NavLink
              to="/portal/notifications"
              className={({ isActive }) =>
                cn('portal-topbar__bell', isActive && 'is-active', unread > 0 && 'has-unread')
              }
            >
              <span className="visually-hidden">
                Notifications{unread > 0 ? `, ${unread} unread` : ''}
              </span>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M9 1.8a4.4 4.4 0 0 0-4.4 4.4c0 3.3-1.1 4.6-1.6 5.2-.2.2 0 .6.3.6h11.4c.3 0 .5-.4.3-.6-.5-.6-1.6-1.9-1.6-5.2A4.4 4.4 0 0 0 9 1.8ZM7.2 14.4a1.8 1.8 0 0 0 3.6 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </NavLink>
            <Link to="/portal/profile" className="portal-topbar__id">
              <span className="portal-topbar__id-mark" aria-hidden="true">
                {firstName ? firstName[0].toUpperCase() : 'A'}
              </span>
              <span className="portal-topbar__id-name">{firstName ?? 'Your profile'}</span>
            </Link>
          </div>
        </header>

        <main id="portal-main" className="portal__view" tabIndex={-1}>
          <div className="portal__view-inner" key={location.pathname} data-portal-view>
            {learnerState.status === 'error' ? (
              <div className="portal-note" role="alert">
                <h2 className="portal-note__title">We couldn&apos;t load your portal</h2>
                <p className="portal-note__body">
                  {learnerState.error.message} Please refresh the page, or sign in again.
                </p>
                <button type="button" className="portal-note__link" onClick={() => navigate(0)}>
                  Retry
                </button>
              </div>
            ) : (
              <Suspense fallback={<PortalLoader label="Loading section" />}>
                <Outlet />
              </Suspense>
            )}
          </div>
        </main>

        <nav className="portal-bottomnav" aria-label="Quick navigation">
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn('portal-bottomnav__item', isActive && 'is-active')}
            >
              <BottomIcon name={item.icon} />
              <span className="portal-bottomnav__label">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className="portal-bottomnav__item"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <BottomIcon name="more" />
            <span className="portal-bottomnav__label">Menu</span>
            {unread > 0 ? <span className="portal-bottomnav__dot" aria-hidden="true" /> : null}
          </button>
        </nav>
      </div>
    </div>
  );
}

function BottomIcon({ name }: { name: 'home' | 'courses' | 'award' | 'tasks' | 'more' }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 8.5 10 3l7 5.5M4.5 7.8V16h11V7.8" />
        </svg>
      );
    case 'courses':
      return (
        <svg {...common}>
          <path d="M4 3.5h9a2 2 0 0 1 2 2V16H6a2 2 0 0 1-2-2V3.5ZM4 14a2 2 0 0 1 2-2h9" />
        </svg>
      );
    case 'award':
      return (
        <svg {...common}>
          <circle cx="10" cy="8" r="4.5" />
          <path d="M7.5 12 6 17l4-2 4 2-1.5-5" />
        </svg>
      );
    case 'tasks':
      return (
        <svg {...common}>
          <path d="M4 4.5h12v11H4zM7 10l2 2 4-4.5" />
        </svg>
      );
    case 'more':
      return (
        <svg {...common}>
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      );
  }
}
