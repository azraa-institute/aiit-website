import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Certificate } from '@aiit/shared';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { formatDate } from '@/lib/format';
import { apiFetch, API_BASE, ApiError } from '@/lib/api';
import {
  CalendarIcon,
  IdCardIcon,
  ShieldCheckIcon,
  DownloadIcon,
  DocumentIcon,
  ShareIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from './VerifyIcons';
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

  function verify() {
    if (!credentialId) return;
    setState({ status: 'loading' });
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
  }

  useEffect(() => {
    if (!credentialId || ran.current === credentialId) return;
    ran.current = credentialId;
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId]);

  return (
    <Layout>
      <Seo title="Verify a certificate" path={`/verify/${credentialId ?? ''}`} noindex />
      <div className="verify-page">
        <div className="container verify-page__inner">
          <p className="eyebrow verify-page__heading">AIIT CREDENTIAL VERIFICATION</p>

          {state.status === 'loading' && <VerifyCardShell><p className="verify-loading">Checking this credential…</p></VerifyCardShell>}

          {state.status === 'not-found' && (
            <VerifyCardShell>
              <StatusPill tone="invalid" label="Credential not found" />
              <h1 className="verify-card__title verify-card__title--status">We couldn&apos;t verify this credential.</h1>
              <p className="verify-card__status-body">
                No AIIT certificate matches the ID <strong>{credentialId}</strong>. Double-check the ID with whoever
                presented it — a valid credential ID always starts with &ldquo;AIIT-&rdquo;.
              </p>
            </VerifyCardShell>
          )}

          {state.status === 'error' && (
            <VerifyCardShell>
              <StatusPill tone="error" label="Verification error" />
              <h1 className="verify-card__title verify-card__title--status">Something went wrong.</h1>
              <p className="verify-card__status-body">{state.message}</p>
              <Button variant="secondary" onClick={verify}>
                Try again
              </Button>
            </VerifyCardShell>
          )}

          {state.status === 'found' && state.certificate.revokedAt && <RevokedCard certificate={state.certificate} />}
          {state.status === 'found' && !state.certificate.revokedAt && <VerifiedCard certificate={state.certificate} />}
        </div>
      </div>
    </Layout>
  );
}

function VerifyCardShell({ children }: { children: React.ReactNode }) {
  return <div className="verify-card">{children}</div>;
}

function StatusPill({ tone, label }: { tone: 'verified' | 'invalid' | 'error' | 'revoked'; label: string }) {
  return (
    <div className={`verify-status verify-status--${tone}`}>
      {tone === 'verified' ? <CheckCircleIcon className="verify-status__mark" /> : <XCircleIcon className="verify-status__mark" />}
      <span>{label}</span>
    </div>
  );
}

/**
 * The row stays resolvable (not a 404) once revoked -- see the schema
 * comment on Certificate.revokedAt -- so an employer sees exactly why this
 * credential no longer stands rather than a bare "not found" that reads
 * identically to a forged ID. No download link here: a revoked certificate
 * shouldn't be handed out as if it still is one.
 */
function RevokedCard({ certificate }: { certificate: Certificate }) {
  return (
    <div className="verify-card verify-card--credential">
      <img className="verify-card__seal" src="/assets/legal/az-seal-gold.webp" alt="" aria-hidden="true" />

      <StatusPill tone="revoked" label="Revoked credential" />

      <h1 className="verify-card__title verify-card__title--status">
        This credential for {certificate.holderName} has been revoked.
      </h1>
      <p className="verify-card__status-body">
        AIIT issued this credential for <strong>{certificate.course.title}</strong>, but it is no longer valid as of{' '}
        {formatDate(certificate.revokedAt!)}
        {certificate.revokedReason ? <>: {certificate.revokedReason}</> : '.'}
      </p>

      <dl className="verify-card__meta">
        <div className="verify-card__meta-item">
          <span className="verify-card__meta-icon">
            <CalendarIcon />
          </span>
          <div>
            <dt>Originally issued</dt>
            <dd>{formatDate(certificate.issuedAt)}</dd>
          </div>
        </div>
        <div className="verify-card__meta-item">
          <span className="verify-card__meta-icon">
            <IdCardIcon />
          </span>
          <div>
            <dt>Credential ID</dt>
            <dd className="verify-card__meta-id">{certificate.credentialId}</dd>
          </div>
        </div>
      </dl>

      <div className="verify-reference">Verification reference · {certificate.credentialId}</div>
    </div>
  );
}

function VerifiedCard({ certificate }: { certificate: Certificate }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle');
  const verifyUrl = typeof window !== 'undefined' ? window.location.href : `https://aiit.network/verify/${certificate.credentialId}`;
  const pdfHref = `${API_BASE}/certificates/verify/${encodeURIComponent(certificate.credentialId)}/pdf`;

  async function handleShare() {
    const shareData = {
      title: 'AIIT credential verification',
      text: `Verify ${certificate.holderName}'s AIIT credential`,
      url: verifyUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(verifyUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2200);
    } catch {
      // A user-cancelled navigator.share() also rejects -- not a real failure, nothing to report.
      if (!navigator.share) {
        setShareState('error');
        setTimeout(() => setShareState('idle'), 2200);
      }
    }
  }

  return (
    <div className="verify-card verify-card--credential">
      <img className="verify-card__seal" src="/assets/legal/az-seal-gold.webp" alt="" aria-hidden="true" />

      <StatusPill tone="verified" label="Verified AIIT credential" />

      <h1 className="verify-card__name">{certificate.holderName}</h1>
      <p className="verify-card__body">
        has successfully completed <strong>{certificate.course.title}</strong>, an AIIT course, and was issued the
        credential below by AIIT — Azraa Institute of Information Technology.
      </p>

      <div className="verify-divider" role="presentation">
        <span className="verify-divider__diamond" />
      </div>

      <dl className="verify-card__meta">
        <div className="verify-card__meta-item">
          <span className="verify-card__meta-icon">
            <CalendarIcon />
          </span>
          <div>
            <dt>Issued</dt>
            <dd>{formatDate(certificate.issuedAt)}</dd>
          </div>
        </div>
        <div className="verify-card__meta-item">
          <span className="verify-card__meta-icon">
            <IdCardIcon />
          </span>
          <div>
            <dt>Credential ID</dt>
            <dd className="verify-card__meta-id">{certificate.credentialId}</dd>
          </div>
        </div>
      </dl>

      <div className="verify-authentic">
        <span className="verify-authentic__icon">
          <ShieldCheckIcon />
        </span>
        <div>
          <p className="verify-authentic__title">Authenticity confirmed</p>
          <p className="verify-authentic__body">This credential matches the issuing institution&apos;s records.</p>
        </div>
      </div>

      <Button as="a" href={pdfHref} className="verify-download" fullWidth>
        <DownloadIcon className="verify-download__icon" />
        <span className="verify-download__label">Download certificate (PDF)</span>
        <ChevronRightIcon className="verify-download__chevron" />
      </Button>

      <div className="verify-actions">
        <button type="button" className="verify-actions__item" onClick={() => setDetailsOpen((v) => !v)} aria-expanded={detailsOpen}>
          <DocumentIcon />
          <span>View certificate details</span>
          <ChevronRightIcon className={detailsOpen ? 'verify-actions__chevron is-open' : 'verify-actions__chevron'} />
        </button>
        <span className="verify-actions__sep" aria-hidden="true" />
        <button type="button" className="verify-actions__item" onClick={handleShare}>
          <ShareIcon />
          <span>{shareState === 'copied' ? 'Link copied' : shareState === 'error' ? 'Could not share' : 'Share verification'}</span>
          <ChevronRightIcon className="verify-actions__chevron" />
        </button>
      </div>

      {detailsOpen && (
        <dl className="verify-details">
          <div>
            <dt>Course</dt>
            <dd>
              <Link to={`/courses/${certificate.course.slug}`}>{certificate.course.title}</Link>
            </dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{certificate.course.level}</dd>
          </div>
          {certificate.course.domain ? (
            <div>
              <dt>Domain</dt>
              <dd>{certificate.course.domain.name}</dd>
            </div>
          ) : null}
          <div>
            <dt>Issuing institution</dt>
            <dd>AIIT — Azraa Institute of Information Technology</dd>
          </div>
        </dl>
      )}

      <div className="verify-reference">Verification reference · {certificate.credentialId}</div>
    </div>
  );
}
