import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { PRIMARY_NAV } from '@/data/navigation';
import { cn } from '@/lib/cn';
import { SocialLinks } from '@/components/common/SocialLinks';
import { MobileMenu } from './MobileMenu';
import { SiteSearch } from './SiteSearch';
import { Logo } from './Logo';
import './header.css';

interface HeaderProps {
  /** When true the header starts transparent over a dark hero, then solidifies. */
  overHero?: boolean;
}

export function Header({ overHero = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const location = useLocation();
  const closeTimer = useRef<number | undefined>(undefined);
  const focusIntoPanel = useRef<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setOpenGroup(null);
  }, [location.pathname]);

  /* Hover intent: a short close delay stops the panel flickering when the
     cursor crosses the gap between the trigger and the panel. */
  const openNow = useCallback((label: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenGroup(label);
  }, []);
  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenGroup(null), 180);
  }, []);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!openGroup) return;

    // If the panel was opened from the keyboard, move focus onto its first link
    // once the panel has actually painted (two frames — the panel animates in
    // from visibility:hidden, and .focus() is a no-op while it is still hidden).
    let raf1 = 0;
    let raf2 = 0;
    if (focusIntoPanel.current === openGroup) {
      focusIntoPanel.current = null;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>('.site-header__item.is-open .site-header__panel-link')
            ?.focus();
        });
      });
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const el = document.activeElement as HTMLElement | null;
      el?.closest('.site-header__item')?.querySelector<HTMLElement>('.site-header__link')?.focus();
      setOpenGroup(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      document.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  /* Transparent only over the hero with nothing open; opening a menu, search or
     dropdown solidifies the bar so the surface below has a proper backdrop. */
  const transparent = overHero && !scrolled && !menuOpen && !searchOpen && !openGroup;
  /** Dark (ink) header: transparent over hero, OR solid-black after scroll. */
  const dark = transparent || scrolled;

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header
        className={cn(
          'site-header',
          scrolled && 'site-header--scrolled',
          transparent && 'site-header--transparent',
          openGroup && 'site-header--menu-open',
          dark && 'on-ink',
        )}
      >
        <div className="site-header__inner container container--wide">
          <Link to="/" className="site-header__brand" aria-label="AIIT home">
            <Logo variant={dark ? 'light' : 'dark'} />
          </Link>

          <nav className="site-header__nav" aria-label="Primary">
            <ul role="list">
              {PRIMARY_NAV.map((item) => {
                const groupOpen = openGroup === item.label;
                return (
                  <li
                    key={item.label}
                    className={cn('site-header__item', item.children && 'has-children', groupOpen && 'is-open')}
                    onMouseEnter={() => item.children && openNow(item.label)}
                    onMouseLeave={() => item.children && closeSoon()}
                    onFocus={() => item.children && openNow(item.label)}
                    onBlur={(e) => {
                      if (item.children && !e.currentTarget.contains(e.relatedTarget as Node)) {
                        setOpenGroup((g) => (g === item.label ? null : g));
                      }
                    }}
                  >
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) => cn('site-header__link', isActive && 'is-active')}
                      aria-haspopup={item.children ? 'true' : undefined}
                      aria-expanded={item.children ? groupOpen : undefined}
                      onClick={() => setOpenGroup(null)}
                      onFocus={() => item.children && openNow(item.label)}
                      onKeyDown={(e) => {
                        if (!item.children) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          focusIntoPanel.current = item.label;
                          openNow(item.label);
                        }
                      }}
                    >
                      {item.label}
                      {item.children && (
                        <svg className="site-header__caret" width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
                          <path d="M1 1l3.5 3.5L8 1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      )}
                    </NavLink>

                    {item.children && (
                      <div className="site-header__panel" role="group" aria-label={`${item.label} menu`}>
                        <div className="site-header__panel-inner">
                          <p className="site-header__panel-label">{item.label}</p>
                          <ul role="list">
                            {item.children.map((child) => {
                              const current = child.to === location.pathname;
                              return (
                                <li key={child.label}>
                                  <Link
                                    to={child.to}
                                    className={cn('site-header__panel-link', current && 'is-current')}
                                    aria-current={current ? 'page' : undefined}
                                  >
                                    <span className="site-header__panel-link-label">
                                      {child.label}
                                      <svg
                                        className="site-header__panel-arrow"
                                        width="14"
                                        height="9"
                                        viewBox="0 0 14 9"
                                        aria-hidden="true"
                                      >
                                        <path
                                          d="M9 1l4 3.5L9 8M13 4.5H1"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </span>
                                    {child.description && (
                                      <span className="site-header__panel-link-desc">{child.description}</span>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="site-header__actions">
            <button
              type="button"
              className="site-header__search-toggle"
              aria-label="Search the site"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden="true">
                <circle cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M11 11l4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
            <Link to="/login" className="site-header__login">
              Login
            </Link>
            <SocialLinks className="site-header__social" />
            <button
              className="site-header__burger"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <SiteSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSearch={() => {
          setMenuOpen(false);
          setSearchOpen(true);
        }}
      />
    </>
  );
}
