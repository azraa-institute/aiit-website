import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate, formatTime } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { useLearner } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';

export default function WebinarsPage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your webinars" />;
  if (state.status === 'error') return null;

  const webinars = state.learner.webinars;
  const upcoming = webinars.filter((w) => w.status === 'upcoming');
  const past = webinars.filter((w) => w.status !== 'upcoming');

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Webinar registrations</p>
        <h1 className="portal-page__title">Live sessions</h1>
        <p className="portal-page__intro">
          AIIT webinars and workshops you&apos;ve registered for — upcoming first, with a direct link to join.
        </p>
      </header>

      {webinars.length === 0 ? (
        <PortalEmpty
          title="No registrations yet"
          body="Reserve a seat at a free AIIT webinar and it will show here, with the date and a join link when it goes live."
          action={{ label: 'See upcoming webinars', to: '/webinar' }}
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section className="portal-section" data-reveal>
              <p className="portal-eyebrow">Upcoming</p>
              <ul className="webinars" role="list">
                {upcoming.map((w) => (
                  <li key={w.id} className="webinar" data-reveal>
                    <div>
                      <h2 className="webinar__title">{w.title}</h2>
                      {w.startsAt ? (
                        <p className="webinar__when">
                          {formatDate(w.startsAt)}
                          {formatTime(w.startsAt) ? ` · ${formatTime(w.startsAt)}` : ''}
                        </p>
                      ) : null}
                    </div>
                    {w.joinUrl ? (
                      <Button as="a" href={w.joinUrl} target="_blank" rel="noopener" size="sm" arrow>
                        Join
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section className="portal-section" data-reveal>
              <p className="portal-eyebrow">Past</p>
              <ul className="webinars" role="list">
                {past.map((w) => (
                  <li key={w.id} className="webinar webinar--past">
                    <div>
                      <h2 className="webinar__title">{w.title}</h2>
                      <p className="webinar__when">
                        {w.status === 'attended' ? 'Attended' : 'Missed'}
                        {w.startsAt ? ` · ${formatDate(w.startsAt)}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
