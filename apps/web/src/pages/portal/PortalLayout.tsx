import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/AuthContext';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { Logo } from '@/components/layout/Logo';
import { Toast } from '@/components/common/Toast';
import { Avatar } from '@/components/common/Avatar';
import { apiFetch } from '@/lib/api';
import { ProfileCompletionWizard } from './ProfileCompletionWizard';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { GuidedTour } from './GuidedTour';
import { PortalActionsProvider } from './PortalActionsContext';
import { publicFileUrl } from '@/lib/storage';
import { clearPortalReturn } from '@/lib/portalReturn';
import { useLearner, greetingName } from './learnerData';
import { PortalAtmosphere } from './PortalAtmosphere';
import { PortalLoader } from './PortalLoader';
import './portal.css';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  group: 'primary' | 'study' | 'account';
  /** Matches a GuidedTour step's target id -- see GuidedTour.tsx's own doc comment on why these live on both the rail link and its BOTTOM_NAV counterpart. */
  tourId?: string;
}

const NAV: NavItem[] = [
  { to: '/portal', label: 'Dashboard', end: true, group: 'primary', tourId: 'tour-dashboard' },
  { to: '/portal/courses', label: 'My courses', group: 'primary', tourId: 'tour-courses' },
  { to: '/portal/certificates', label: 'Certificates', group: 'primary', tourId: 'tour-certificates' },
  { to: '/portal/assignments', label: 'Assignments', group: 'primary', tourId: 'tour-assignments' },
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
  { to: '/portal', label: 'Home', end: true, icon: 'home' as const, tourId: 'tour-dashboard' },
  { to: '/portal/courses', label: 'Courses', icon: 'courses' as const, tourId: 'tour-courses' },
  { to: '/portal/certificates', label: 'Certificates', icon: 'award' as const, tourId: 'tour-certificates' },
  { to: '/portal/assignments', label: 'Tasks', icon: 'tasks' as const, tourId: 'tour-assignments' },
];

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const learnerState = useLearner();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const shownWelcome = useRef(false);
  // Auto-opens the wizard once per mount when the profile turns out
  // incomplete -- a ref (not just checking profileComplete inline) so
  // dismissing it (Skip) doesn't cause it to immediately reopen on the
  // next render/refetch; the persistent ProfileCompletionBanner below
  // covers reminding them from then on, and its own button can reopen it.
  const autoOpenedWizard = useRef(false);

  useLockBodyScroll(menuOpen);
  useLockBodyScroll(wizardOpen);

  // Closing the wizard (Skip, or Finish) is the one moment
  // ProfileCompletionBanner actually animates from collapsed to its real
  // height -- see that component's own doc comment for the Chromium bug
  // this whole always-mounted/grid-column setup exists to dodge (a new
  // grid item appearing next to .portal-topbar's position: sticky leaves
  // that whole top strip un-repainted until a hard navigation). Confirmed
  // live this session: that fix covers the *mount* case, but the bug can
  // still recur on the banner's own max-height transition, which is also
  // a layout-affecting change right next to the same sticky element --
  // reported as the topbar's row rendering blank until a refresh, exactly
  // matching the original bug's "until a hard navigation" symptom.
  // Nudging the scroll position by 1px and back, timed just past the
  // banner's transition (--dur-base, 320ms in tokens.css), forces Chromium
  // to re-run the scroll-driven repaint it's failing to trigger on its
  // own -- the same mechanism a real scroll already fixes, per the user
  // report this was diagnosed from. window.scrollY === 0 guards against
  // nudging a genuine scroll position elsewhere on the page (the wizard
  // was open with body scroll locked, so this is normally already true).
  const prevWizardOpen = useRef(wizardOpen);
  useEffect(() => {
    const wasOpen = prevWizardOpen.current;
    prevWizardOpen.current = wizardOpen;
    if (!wasOpen || wizardOpen || window.scrollY !== 0) return;
    const id = window.setTimeout(() => {
      window.scrollBy(0, 1);
      requestAnimationFrame(() => window.scrollBy(0, -1));
    }, 360);
    return () => window.clearTimeout(id);
  }, [wizardOpen]);

  // Real signal, not a heuristic: `isNewSignup` only comes back true on the
  // exact GET /auth/me call that just fired the API's one-time welcome
  // email, i.e. an actual first-ever signup -- true alike for Google and
  // email/password. Guarded by a ref (not just the flag itself) so a later
  // refetch() during this same mount -- which will see isNewSignup: false,
  // since the API already claimed it -- can't accidentally hide a toast
  // that's already showing.
  useEffect(() => {
    if (shownWelcome.current) return;
    if (learnerState.status === 'ready' && learnerState.learner.isNewSignup) {
      shownWelcome.current = true;
      setShowWelcome(true);
    }
  }, [learnerState]);

  // Same one-shot-per-mount guard as the welcome toast above -- opens
  // automatically the first time this mount sees an incomplete profile,
  // but a later refetch (e.g. after Skip, or after the wizard's own
  // Finish call) never reopens it on its own; ProfileCompletionBanner's
  // button is what reopens it after that.
  useEffect(() => {
    if (autoOpenedWizard.current) return;
    if (learnerState.status === 'ready' && !learnerState.learner.profileComplete) {
      autoOpenedWizard.current = true;
      setWizardOpen(true);
    }
  }, [learnerState]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Back inside the portal shell -- whatever "Return to X" the public
  // header was offering no longer applies until the next time they leave.
  useEffect(() => {
    clearPortalReturn();
  }, []);

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

  // Click-outside + Escape for the profile menu.
  useEffect(() => {
    if (!profileMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!profileMenuRef.current?.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [profileMenuOpen]);

  const learner = learnerState.learner;
  const unread = learner?.notifications.filter((n) => !n.read).length ?? 0;
  const firstName = learner ? greetingName(learner) : null;
  const avatarUrl = publicFileUrl('avatars', learner?.profile.avatarKey);
  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const sectionLabel = current?.label ?? 'Portal';

  function handleSignOut() {
    signOut().then(() => navigate('/login'));
  }

  const portalActions = useMemo(
    () => ({ openWizard: () => setWizardOpen(true), openTour: () => setTourOpen(true) }),
    [],
  );

  /** Persists tour completion/skip to the same preferences JSON blob SettingsPage's language picker already uses -- informational (nothing currently gates on it; the tour is never auto-forced), but keeps the learner's choice on record per the redesign spec. Best-effort: a failed write shouldn't block closing the tour. */
  function recordTourStatus(status: 'completed' | 'skipped') {
    if (!learner) return;
    apiFetch('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ preferences: { ...learner.profile.preferences, tour: status } }),
    })
      .then(() => learnerState.refetch())
      .catch(() => {});
  }

  return (
    <div className={cn('portal', menuOpen && 'portal--menu-open', wizardOpen && 'portal--blurred')}>
      <Seo title="Learner portal" path="/portal" noindex />
      <PortalAtmosphere />

      <a className="portal__skip skip-link" href="#portal-main">
        Skip to content
      </a>

      {showWelcome && (
        <Toast
          message={
            firstName
              ? `Welcome, ${firstName} — you're all set. Please complete your profile to unlock enrollment and your portal.`
              : "Welcome — you're all set. Please complete your profile to unlock enrollment and your portal."
          }
          onDismiss={() => setShowWelcome(false)}
        />
      )}

      <ProfileCompletionBanner
        visible={Boolean(learner && !learner.profileComplete && !wizardOpen)}
        onComplete={() => setWizardOpen(true)}
      />

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
                      data-tour={item.tourId}
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
            <div className="portal-topbar__id-wrap" ref={profileMenuRef}>
              <button
                type="button"
                className="portal-topbar__id"
                data-tour="tour-account"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
              >
                <Avatar name={learner?.profile.name} photoUrl={avatarUrl} size="sm" className="portal-topbar__id-mark" />
                <span className="portal-topbar__id-text">
                  <span className="portal-topbar__id-name">{firstName ?? 'Your profile'}</span>
                  {learner?.profile.headline ? (
                    <span className="portal-topbar__id-headline">{learner.profile.headline}</span>
                  ) : null}
                </span>
              </button>

              {profileMenuOpen && (
                <div className="portal-topbar__id-menu" role="menu">
                  <Link
                    to="/portal/profile"
                    role="menuitem"
                    className="portal-topbar__id-menu-item"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    View profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="portal-topbar__id-menu-item portal-topbar__id-menu-item--danger"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
              <PortalActionsProvider value={portalActions}>
                <Suspense fallback={<PortalLoader label="Loading section" />}>
                  <Outlet />
                </Suspense>
              </PortalActionsProvider>
            )}
          </div>
        </main>

        <nav className="portal-bottomnav" aria-label="Quick navigation">
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-tour={item.tourId}
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

      {learner ? (
        <ProfileCompletionWizard
          open={wizardOpen}
          profile={learner.profile}
          onClose={() => setWizardOpen(false)}
          onComplete={(action) => {
            learnerState.refetch();
            setWizardOpen(false);
            if (action === 'tour') setTourOpen(true);
          }}
        />
      ) : null}

      <GuidedTour
        open={tourOpen}
        onClose={(status) => {
          setTourOpen(false);
          recordTourStatus(status);
        }}
      />
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
