import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { apiFetch, ApiError } from '@/lib/api';

type Status = 'loading' | 'done' | 'error';

export default function NewsletterUnsubscribePage() {
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
      setError('This unsubscribe link is missing its token.');
      return;
    }

    apiFetch('/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => setStatus('done'))
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'Could not unsubscribe you.');
      });
  }, [token]);

  return (
    <Layout>
      <Seo title="Unsubscribe" path="/newsletter/unsubscribe" noindex />
      <div
        className="section container container--wide"
        style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-5)' }}
      >
        {status === 'loading' && <p className="lead">Unsubscribing you…</p>}
        {status === 'done' && (
          <>
            <p className="eyebrow">Newsletter</p>
            <h1 className="display-2">You&apos;re unsubscribed.</h1>
            <p className="lead">You won&apos;t receive AIIT newsletter emails any more.</p>
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
            <h1 className="display-2">Couldn&apos;t process that.</h1>
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
