import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Seo } from '@/lib/Seo';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';

/**
 * Lands here after email confirmation, magic-link, or Google OAuth.
 * Implicit-flow sessions (email confirmation, magic link) are parsed from
 * the URL hash by supabase-js itself on load (detectSessionInUrl defaults
 * to true) -- this page just waits for AuthContext to reflect that. PKCE/
 * OAuth flows (Google) carry a `?code=` param that needs an explicit
 * exchange. `handled` guards against React 18 StrictMode's double effect
 * invocation calling exchangeCodeForSession twice with an already-used code.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    if (!supabase) {
      handled.current = true;
      navigate('/login', { replace: true, state: { authError: 'Sign-in is not configured yet.' } });
      return;
    }

    const code = new URL(window.location.href).searchParams.get('code');
    if (code) {
      handled.current = true;
      supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
        navigate(error ? '/login' : '/portal', {
          replace: true,
          state: error ? { authError: error.message } : undefined,
        });
      });
      return;
    }

    if (status === 'authenticated') {
      handled.current = true;
      navigate('/portal', { replace: true });
    } else if (status === 'anonymous') {
      handled.current = true;
      navigate('/login', {
        replace: true,
        state: { authError: 'That sign-in link is invalid or has expired.' },
      });
    }
  }, [status, navigate]);

  return (
    <>
      <Seo title="Signing in" path="/auth/callback" noindex />
      <RouteFallback />
    </>
  );
}
