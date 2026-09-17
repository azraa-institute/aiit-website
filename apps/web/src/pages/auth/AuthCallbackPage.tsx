import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { canEnterPortal } from '@/lib/api';
import { needsMfaChallenge } from '@/lib/mfa';
import { AuthLayout } from './AuthLayout';
import { MfaChallenge } from './MfaChallenge';

/**
 * Lands here after email confirmation, magic-link, or Google OAuth.
 * Implicit-flow sessions (email confirmation, magic link) are parsed from
 * the URL hash by supabase-js itself on load (detectSessionInUrl defaults
 * to true) -- this page just waits for AuthContext to reflect that. PKCE/
 * OAuth flows (Google) carry a `?code=` param that needs an explicit
 * exchange. `handled` guards against React 18 StrictMode's double effect
 * invocation calling exchangeCodeForSession twice with an already-used code.
 * PortalLayout's one-time welcome toast is driven by the API's own
 * `isNewSignup` signal (GET /auth/me), not anything decided here -- this
 * page's only job is landing every real session on /portal, via an MFA
 * challenge first if the account has 2FA enrolled (see MfaChallenge --
 * Supabase issues a usable session before that's checked either way, so
 * both sign-in paths that land here need the same gate LoginPage's
 * password path has).
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const handled = useRef(false);
  const [mfaPending, setMfaPending] = useState(false);

  useEffect(() => {
    if (handled.current) return;

    if (!supabase) {
      handled.current = true;
      navigate('/login', { replace: true, state: { authError: 'Sign-in is not configured yet.' } });
      return;
    }

    async function landOrChallenge() {
      if (await needsMfaChallenge()) {
        setMfaPending(true);
        return;
      }
      // Supabase considers this session valid regardless of whether the
      // profile row it points to still exists -- see canEnterPortal()'s
      // own comment. Nothing to do in the false branch: a hard redirect to
      // /login?reason=deleted is already under way by then, so this just
      // stays on RouteFallback until that takes over.
      if (await canEnterPortal()) {
        navigate('/portal', { replace: true });
      }
    }

    const code = new URL(window.location.href).searchParams.get('code');
    if (code) {
      handled.current = true;
      supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
        if (error) {
          navigate('/login', { replace: true, state: { authError: error.message } });
          return;
        }
        void landOrChallenge();
      });
      return;
    }

    if (status === 'authenticated') {
      handled.current = true;
      void landOrChallenge();
    } else if (status === 'anonymous') {
      handled.current = true;
      navigate('/login', {
        replace: true,
        state: { authError: 'That sign-in link is invalid or has expired.' },
      });
    }
  }, [status, navigate]);

  if (mfaPending) {
    return (
      <>
        <Seo title="Two-factor authentication" path="/auth/callback" noindex />
        <AuthLayout
          title="Two-factor authentication"
          intro="Enter the code from your authenticator app to finish signing in."
          footer={null}
        >
          <MfaChallenge
            onVerified={async () => {
              if (await canEnterPortal()) navigate('/portal', { replace: true });
            }}
          />
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <Seo title="Signing in" path="/auth/callback" noindex />
      <RouteFallback />
    </>
  );
}
