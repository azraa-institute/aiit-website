import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { apiFetch, ApiError } from '@/lib/api';

type Status = 'loading' | 'done' | 'error';

export default function NewsletterConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('error');
      setError('This confirmation link is missing its token.');
      return;
    }

    apiFetch('/newsletter/confirm', { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => setStatus('done'))
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'Could not confirm your subscription.');
      });
  }, [token]);

  return (
    <Layout>
      <Seo title="Confirm subscription" path="/newsletter/confirm" noindex />
      <div
        className="section container container--wide"
        style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-5)' }}
      >
        {status === 'loading' && <p className="lead">Confirming your subscription…</p>}
        {status === 'done' && (
          <>
            <p className="eyebrow">Newsletter</p>
            <h1 className="display-2">You&apos;re subscribed.</h1>
            <p className="lead">
              Look out for AIIT updates, insights and upcoming webinars. You can unsubscribe any time
              from the link in any newsletter email.
            </p>
            <div>
              <Button as="link" to="/" arrow>
                Back to home
              </Button>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="eyebrow">Newsletter</p>
            <h1 className="display-2">Couldn&apos;t confirm your subscription.</h1>
            <p className="lead">{error}</p>
            <div>
              <Button as="link" to="/" arrow>
                Back to home
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
