import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { SITE } from '@/data/site';
import { Plate } from '@/components/primitives/Plate';
import { Logo } from '@/components/layout/Logo';
import './auth.css';

interface AuthLayoutProps {
  title: string;
  intro: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Optional provider button(s), e.g. <GoogleAuthButton />. Renders below a divider. */
  social?: ReactNode;
  /** 'staff' switches the card to the admin/instructor look (purple accent, icon fields) -- see auth.css. */
  tone?: 'default' | 'staff';
  /** Overrides the photo-panel image; defaults to the student one. */
  asideImage?: string;
  /**
   * 'split' (default): the usual side-by-side -- a tall portrait-cropped
   * photo panel next to the card, full page height. Works for the
   * portrait-ish source photos every other caller uses.
   * 'hero': a full-width 16:9 band above a centered card instead --
   * for a landscape graphic with its own baked-in text (logo, headline),
   * which a tall portrait crop would either letterbox with dead space or
   * crop down to an unrecognizable sliver. No SITE.headline overlay in
   * this mode -- the banner already carries its own.
   */
  layout?: 'split' | 'hero';
  /** 'hero' only: a short gold eyebrow label (dash + small caps, same language as StaffShell's portal label) overlaid on the image, for a photo that doesn't already carry its own program/section label baked in. */
  heroEyebrow?: string;
}

const DEFAULT_ASIDE_IMAGE = '/assets/auth/aiit-registration.webp';

export function AuthLayout({ title, intro, children, footer, social, tone = 'default', asideImage, layout = 'split', heroEyebrow }: AuthLayoutProps) {
  const card = (
    <div className={cn('auth__card', layout === 'hero' && 'on-ink')}>
      <Link to="/" className="auth__brand" aria-label="AIIT home">
        <Logo variant={layout === 'hero' ? 'light' : 'dark'} />
      </Link>
      <header className="auth__head">
        <h1 className="auth__title">{title}</h1>
        <p className="auth__intro">{intro}</p>
      </header>
      {children}
      {social && (
        <>
          <div className="auth__divider">Or continue with</div>
          <div className="auth__social">{social}</div>
        </>
      )}
      {footer && <div className="auth__footer">{footer}</div>}
    </div>
  );

  if (layout === 'hero') {
    return (
      <div className="auth auth--hero">
        <div className="auth__hero-band on-ink">
          <Plate source={asideImage ?? DEFAULT_ASIDE_IMAGE} seed="auth" ratio={16 / 9} tone="ink" fit="cover" alt="" />
        </div>
        <main className="auth__main" id="main">
          {/* The eyebrow and card move as one unit (same flex stack), not
              independently positioned over the image -- that's what let
              them drift apart (the eyebrow pinned to a fixed viewport
              offset, the card's own position driven by its content height
              and vertical centering) at viewport sizes/card heights other
              than whatever one this was tuned against. */}
          <div className="auth__hero-stack">
            {heroEyebrow && <p className="auth__hero-eyebrow">{heroEyebrow}</p>}
            {card}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={cn('auth', tone === 'staff' && 'auth--staff')}>
      <aside className="auth__aside on-ink">
        <Plate source={asideImage ?? DEFAULT_ASIDE_IMAGE} seed="auth" ratio={3 / 4} tone="ink" className="auth__aside-art" alt="" />
        <div className="auth__aside-inner">
          <div className="auth__aside-copy">
            <p className="auth__aside-statement">{SITE.headline}</p>
            <p className="auth__progression">{SITE.progression.join('  ·  ')}</p>
          </div>
        </div>
      </aside>

      <main className="auth__main" id="main">
        {card}
      </main>
    </div>
  );
}

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
);

const MicrosoftMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
    <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
    <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
    <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
  </svg>
);

const FacebookMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M18 9a9 9 0 1 0-10.4 8.89v-6.29H5.31V9h2.29V7.01c0-2.26 1.35-3.51 3.41-3.51.99 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.41V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9Z"
    />
  </svg>
);

/**
 * Icon-only, so the accessible name lives entirely in aria-label; `title`
 * adds a native tooltip on hover for sighted mouse users.
 */
function ProviderButton({
  provider,
  onClick,
  label,
}: {
  provider: 'google' | 'azure' | 'facebook';
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`auth__provider auth__provider--${provider}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {provider === 'google' ? <GoogleMark /> : provider === 'azure' ? <MicrosoftMark /> : <FacebookMark />}
    </button>
  );
}

/**
 * Rendered by LoginPage/RegisterPage via AuthLayout's `social` slot, wired
 * to supabase.auth.signInWithOAuth({ provider: 'google' }).
 */
export function GoogleAuthButton({ onClick }: { onClick?: () => void }) {
  return <ProviderButton provider="google" onClick={onClick} label="Continue with Google" />;
}

/**
 * Supabase's OAuth provider id for Microsoft/Outlook accounts (personal and
 * work/school, via Entra ID) is "azure", not "microsoft" -- the class name
 * still reads auth__provider--azure to match.
 */
export function MicrosoftAuthButton({ onClick }: { onClick?: () => void }) {
  return <ProviderButton provider="azure" onClick={onClick} label="Continue with Microsoft" />;
}

export function FacebookAuthButton({ onClick }: { onClick?: () => void }) {
  return <ProviderButton provider="facebook" onClick={onClick} label="Continue with Facebook" />;
}
