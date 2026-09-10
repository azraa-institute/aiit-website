import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { useLearner } from './learnerData';
import { PortalLoader } from './PortalLoader';
import { PortalNote } from './PortalEmpty';

export default function ProfilePage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your profile" />;
  if (state.status === 'error') return null;

  const p = state.learner.profile;
  const hasAny = Boolean(p.name || p.email || p.headline || p.location);

  const rows: { label: string; value: string | undefined }[] = [
    { label: 'Name', value: p.name },
    { label: 'Headline', value: p.headline },
    { label: 'Email', value: p.email },
    { label: 'Location', value: p.location },
    { label: 'Member since', value: p.joinedAt ? formatDate(p.joinedAt) : undefined },
  ];

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Profile</p>
        <h1 className="portal-page__title">{p.name ?? 'Your profile'}</h1>
        <p className="portal-page__intro">
          How you appear across AIIT — your learning identity, kept in one place.
        </p>
      </header>

      {hasAny ? (
        <dl className="profile" data-reveal>
          {rows
            .filter((r) => r.value)
            .map((r) => (
              <div className="profile__row" key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <PortalNote title="Your profile isn't set up yet" to="/portal/settings" toLabel="Go to account settings">
          Your name, contact details and learning identity are managed on your AIIT account. Once
          they&apos;re set, they&apos;ll show here and across your certificates.
        </PortalNote>
      )}
    </div>
  );
}
