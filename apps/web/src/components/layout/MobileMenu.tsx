import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PRIMARY_NAV } from '@/data/navigation';
import { SITE } from '@/data/site';
import { useLockBodyScroll } from '@/lib/useLockBodyScroll';
import { cn } from '@/lib/cn';
import { Button } from '@/components/primitives/Button';
import { SocialLinks } from '@/components/common/SocialLinks';
import { Logo } from './Logo';
import './mobile-menu.css';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}

/** A child link is "current" whether it targets the bare route or that
 * route with the exact query string this page is showing (course-domain
 * filters live in the query string, not the path). */
function isChildCurrent(childTo: string, pathname: string, search: string) {
  return childTo === pathname || childTo === `${pathname}${search}`;
}

/** aiit.network's mobile navigation. Renders PRIMARY_NAV — the exact same
 * top-level labels and dropdown structure as the desktop header — as an
 * editorial numbered list where each parent with children becomes an
 * expandable group. Keeping one nav source means the two never drift apart. */
export function MobileMenu({ open, onClose, onOpenSearch }: MobileMenuProps) {
  const { pathname, search } = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  useLockBodyScroll(open);

  // On open, auto-expand whichever group (if any) contains the current page —
  // and start collapsed once the menu is closed again.
  useEffect(() => {
    if (!open) {
      setOpenGroup(null);
      return;
    }
    const active = PRIMARY_NAV.find((item) =>
      item.children?.some((c) => isChildCurrent(c.to, pathname, search)),
    );
    setOpenGroup(active?.label ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={cn('mobile-menu', 'on-ink', open && 'is-open')} aria-hidden={!open}>
      <div className="mobile-menu__atmosphere" aria-hidden="true" />

      <div className="mobile-menu__bar container container--wide">
        <Logo variant="light" />
        <div className="mobile-menu__bar-actions">
          <button className="mobile-menu__icon" onClick={onOpenSearch} aria-label="Search the site">
            <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <button className="mobile-menu__icon" onClick={onClose} aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M3 3l16 16M19 3 3 19" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="mobile-menu__nav container container--wide" aria-label="Primary">
        <ol className="mobile-menu__list" role="list">
          {PRIMARY_NAV.map((item, i) => {
            const index = String(i + 1).padStart(2, '0');
            const hasChildren = !!item.children;
            const isGroupOpen = openGroup === item.label;
            const isCurrent = !hasChildren && item.to === pathname;
            const hasActiveChild = hasChildren && item.children!.some((c) => isChildCurrent(c.to, pathname, search));

            return (
              <li
                key={item.label}
                className="mobile-menu__row"
                style={{ '--i': i } as React.CSSProperties}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    className="mobile-menu__link"
                    data-active={hasActiveChild ? '' : undefined}
                    aria-expanded={isGroupOpen}
                    onClick={() => setOpenGroup(isGroupOpen ? null : item.label)}
                  >
                    <span className="mobile-menu__index">{index}</span>
                    <span className="mobile-menu__label">{item.label}</span>
                    <span className="mobile-menu__toggle" data-open={isGroupOpen ? '' : undefined} aria-hidden="true">
                      <span />
                      <span />
                    </span>
                  </button>
                ) : (
                  <Link
                    to={item.to}
                    className="mobile-menu__link"
                    data-active={isCurrent ? '' : undefined}
                    onClick={onClose}
                  >
                    <span className="mobile-menu__index">{index}</span>
                    <span className="mobile-menu__label">{item.label}</span>
                    {isCurrent && (
                      <svg className="mobile-menu__mark" width="15" height="11" viewBox="0 0 15 11" aria-hidden="true">
                        <path
                          d="M1 5.5h12M8.5 1l4.5 4.5L8.5 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Link>
                )}

                {hasChildren && (
                  <div className="mobile-menu__group" data-open={isGroupOpen ? '' : undefined}>
                    <div className="mobile-menu__group-inner">
                      <ul role="list">
                        {item.children!.map((child) => (
                          <li key={child.label}>
                            <Link
                              to={child.to}
                              onClick={onClose}
                              className={cn(isChildCurrent(child.to, pathname, search) && 'is-current')}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mobile-menu__panel container container--wide">
        <div className="mobile-menu__cta">
          <Button
            as="link"
            to="/courses"
            fullWidth
            arrow
            onClick={onClose}
            className="mobile-menu__cta-btn"
          >
            Start learning
          </Button>
          <Link to="/login" className="mobile-menu__login" onClick={onClose}>
            Login
          </Link>
        </div>

        <div className="mobile-menu__utility">
          <SocialLinks className="mobile-menu__social" />
          <p className="mobile-menu__contact">
            {SITE.contact.email}
            <span aria-hidden="true"> · </span>
            {SITE.contact.city}, {SITE.contact.country}
          </p>
        </div>
      </div>
    </div>
  );
}
