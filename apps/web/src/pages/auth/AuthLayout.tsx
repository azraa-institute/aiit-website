import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '@/data/site';
import { Plate } from '@/components/primitives/Plate';
import { Logo } from '@/components/layout/Logo';
import './auth.css';

interface AuthLayoutProps {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
  /** Optional provider button(s), e.g. <GoogleAuthButton />. Renders below a divider. */
  social?: ReactNode;
}

export function AuthLayout({ title, intro, children, footer, social }: AuthLayoutProps) {
  return (
    <div className="auth">
      <aside className="auth__aside on-ink">
        <Plate
          source="/assets/auth/aiit-registration.webp"
          seed="auth"
          ratio={3 / 4}
          tone="ink"
          className="auth__aside-art"
          alt=""
        />
        <div className="auth__aside-inner">
          <div className="auth__aside-copy">
            <p className="auth__aside-statement">{SITE.headline}</p>
            <p className="auth__progression">{SITE.progression.join('  ·  ')}</p>
          </div>
        </div>
      </aside>

      <main className="auth__main" id="main">
        <div className="auth__card">
          <Link to="/" className="auth__brand" aria-label="AIIT home">
            <Logo variant="dark" />
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
          <div className="auth__footer">{footer}</div>
        </div>
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

/**
 * Icon-only, so the accessible name lives entirely in aria-label; `title`
 * adds a native tooltip on hover for sighted mouse users.
 */
function ProviderButton({
  provider,
  onClick,
  label,
}: {
  provider: 'google';
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
      <GoogleMark />
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
