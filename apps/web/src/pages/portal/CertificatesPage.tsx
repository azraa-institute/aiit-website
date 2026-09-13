import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { apiFetchBlob, downloadBlob, ApiError } from '@/lib/api';
import { Button } from '@/components/primitives/Button';
import { useLearner } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';

export default function CertificatesPage() {
  const state = useLearner();
  useScrollReveal([state.status]);
  const [downloadingId, setDownloadingId] = useState<string>();
  const [copiedId, setCopiedId] = useState<string>();
  const [error, setError] = useState<string>();

  if (state.status === 'loading') return <PortalLoader label="Loading your certificates" />;
  if (state.status === 'error') return null;

  const { certificates } = state.learner;

  async function handleDownload(id: string, credentialId: string) {
    setError(undefined);
    setDownloadingId(id);
    try {
      const blob = await apiFetchBlob(`/me/certificates/${id}/pdf`);
      downloadBlob(blob, `AIIT-Certificate-${credentialId}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not download this certificate.');
    } finally {
      setDownloadingId(undefined);
    }
  }

  async function handleCopyLink(id: string, credentialId: string) {
    const url = `${window.location.origin}/verify/${credentialId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? undefined : current)), 2000);
    } catch {
      setError('Could not copy the link -- copy it from the address bar after opening it instead.');
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Certificates</p>
        <h1 className="portal-page__title">Your credentials</h1>
        <p className="portal-page__intro">
          Every course you complete on AIIT is certified by AIIT. Your credentials live here —
          verifiable, and yours to share.
        </p>
      </header>

      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}

      {certificates.length === 0 ? (
        <PortalEmpty
          title="No certificates yet"
          body="Complete your first AIIT course to earn a credential. It will appear here with its issue date and verification ID."
          action={{ label: 'Browse courses', to: '/courses' }}
          aside={
            <>
              Certificates can strengthen university and employer applications through the{' '}
              <Link to="/aiit-blueprint">AIIT Blueprint</Link>.
            </>
          }
        />
      ) : (
        <ul className="certs" role="list">
          {certificates.map((c, i) => (
            <li
              key={c.id}
              className="cert"
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
            >
              <div className="cert__seal" aria-hidden="true">
                <span className="cert__seal-ring" />
                <span className="cert__seal-mark">AIIT</span>
              </div>
              <div className="cert__body">
                <p className="cert__eyebrow">Certified</p>
                <h2 className="cert__course">
                  <Link to={`/courses/${c.course.slug}`}>{c.course.title}</Link>
                </h2>
                <p className="cert__meta">
                  Issued {formatDate(c.issuedAt)}
                  <span aria-hidden="true"> · </span>
                  <span className="cert__id">ID {c.credentialId}</span>
                </p>
                <div className="cert__action">
                  <Button
                    as="button"
                    variant="secondary"
                    size="sm"
                    loading={downloadingId === c.id}
                    onClick={() => handleDownload(c.id, c.credentialId)}
                  >
                    Download PDF
                  </Button>
                  <Button as="button" variant="ghost" size="sm" onClick={() => handleCopyLink(c.id, c.credentialId)}>
                    {copiedId === c.id ? 'Link copied' : 'Copy verification link'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
