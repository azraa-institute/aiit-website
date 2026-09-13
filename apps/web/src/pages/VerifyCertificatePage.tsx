import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Certificate } from '@aiit/shared';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { formatDate } from '@/lib/format';
import { apiFetch, API_BASE, ApiError } from '@/lib/api';
import './verify-certificate.css';

type State =
  | { status: 'loading' }
  | { status: 'found'; certificate: Certificate }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

export default function VerifyCertificatePage() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });
  const ran = useRef<string>();

  useEffect(() => {
    if (!credentialId || ran.current === credentialId) return;
    ran.current = credentialId;

    apiFetch<Certificate>(`/certificates/verify/${encodeURIComponent(credentialId)}`)
      .then((certificate) => setState({ status: 'found', certificate }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: 'not-found' });
          return;
        }
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Could not verify this credential right now.',
        });
      });
  }, [credentialId]);

  return (
    <Layout>
      <Seo title="Verify a certificate" path={`/verify/${credentialId ?? ''}`} noindex />
      <div className="section container verify">
        <p className="eyebrow">AIIT credential verification</p>

        {state.status === 'loading' && <p className="lead">Checking this credential…</p>}

        {state.status === 'not-found' && (
          <>
            <h1 className="display-2">We couldn&apos;t verify this credential.</h1>
            <p className="lead">
              No AIIT certificate matches the ID <strong>{credentialId}</strong>. Double-check the ID with
              whoever presented it — a valid credential ID always starts with &ldquo;AIIT-&rdquo;.
            </p>
          </>
        )}

        {state.status === 'error' && (
          <>
            <h1 className="display-2">Something went wrong.</h1>
            <p className="lead">{state.message}</p>
          </>
        )}

        {state.status === 'found' && (
          <div className="verify-card">
            <p className="verify-card__badge">✓ Verified AIIT credential</p>
            <h1 className="verify-card__name">{state.certificate.holderName}</h1>
            <p className="verify-card__body">
              has successfully completed <strong>{state.certificate.course.title}</strong>, an AIIT
              course, and was issued the credential below by AIIT — Azraa Institute of Information
              Technology.
            </p>
            <dl className="verify-card__meta">
              <div>
                <dt>Issued</dt>
                <dd>{formatDate(state.certificate.issuedAt)}</dd>
              </div>
              <div>
                <dt>Credential ID</dt>
                <dd>{state.certificate.credentialId}</dd>
              </div>
            </dl>
            <div className="verify-card__actions">
              <Button
                as="a"
                href={`${API_BASE}/certificates/verify/${encodeURIComponent(state.certificate.credentialId)}/pdf`}
                variant="secondary"
              >
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
