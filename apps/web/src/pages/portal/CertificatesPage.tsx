import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { useLearner, courseById } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';

export default function CertificatesPage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your certificates" />;
  if (state.status === 'error') return null;

  const { certificates } = state.learner;

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
          {certificates.map((c, i) => {
            const course = courseById(c.courseId);
            if (!course) return null;
            return (
              <li
                key={c.credentialId}
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
                    <Link to={`/courses/${course.slug}`}>{course.title}</Link>
                  </h2>
                  <p className="cert__meta">
                    Issued {formatDate(c.issued)}
                    <span aria-hidden="true"> · </span>
                    <span className="cert__id">ID {c.credentialId}</span>
                  </p>
                </div>
                {c.url ? (
                  <div className="cert__action">
                    <Button as="a" href={c.url} target="_blank" rel="noopener" variant="secondary" size="sm">
                      View certificate
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
