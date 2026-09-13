import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate, formatTime } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { useLearner } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import { CalendarIcon, VideoIcon, CheckIcon, ClockIcon } from './content-icons';

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
        <h1 className="portal-page__title">Webinars</h1>
        <p className="portal-page__intro">
          Your registered live sessions, workshops and learning events — upcoming first, with a direct link to
          join.
        </p>
        {webinars.length > 0 ? (
          <div className="webinar-summary">
            <span className="webinar-summary__stat">
              <strong>{upcoming.length}</strong> Upcoming
            </span>
            <span className="webinar-summary__stat">
              <strong>{webinars.length}</strong> Registered
            </span>
          </div>
        ) : null}
      </header>

      {webinars.length === 0 ? (
        <PortalEmpty
          icon={<CalendarIcon />}
          title="No sessions booked"
          body="Reserve a seat at an upcoming AIIT webinar or workshop and your registration will appear here, with the date and a join link when it goes live."
          action={{ label: 'Explore webinars', to: '/webinar' }}
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section className="portal-section" data-reveal>
              <p className="portal-eyebrow">Upcoming</p>
              <ul className="webinars" role="list">
                {upcoming.map((w) => (
                  <li key={w.id} className="webinar-card" data-reveal>
                    <WebinarDateBlock startsAt={w.startsAt} />
                    <div className="webinar-card__body">
                      <p className="webinar-card__label">
                        <VideoIcon /> Live session
                      </p>
                      <h2 className="webinar-card__title">{w.title}</h2>
                      {w.startsAt ? (
                        <p className="webinar-card__when">
                          {formatDate(w.startsAt)}
                          {formatTime(w.startsAt) ? ` · ${formatTime(w.startsAt)}` : ''}
                        </p>
                      ) : null}
                      <p className="webinar-card__note">Your registered session</p>
                    </div>
                    {w.joinUrl ? (
                      <Button
                        as="a"
                        href={w.joinUrl}
                        target="_blank"
                        rel="noopener"
                        size="sm"
                        arrow
                        className="webinar-card__cta"
                      >
                        Join session
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
                  <li key={w.id} className="webinar-card webinar-card--past">
                    <WebinarDateBlock startsAt={w.startsAt} />
                    <div className="webinar-card__body">
                      <p className="webinar-card__label">
                        {w.status === 'attended' ? <CheckIcon /> : <ClockIcon />}
                        {w.status === 'attended' ? 'Attended' : 'Missed'}
                      </p>
                      <h2 className="webinar-card__title">{w.title}</h2>
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

/** The compact "SEP / 15" editorial date anchor -- falls back to a plain
 * "TBA" mark rather than hiding itself when a session has no date yet
 * (formatDate's own "Date to be announced" fallback doesn't split into a
 * month/day pair, so that case is handled here instead of passed through). */
function WebinarDateBlock({ startsAt }: { startsAt?: string }) {
  if (!startsAt) {
    return (
      <div className="webinar-card__date webinar-card__date--tba">
        <span className="webinar-card__date-day">TBA</span>
      </div>
    );
  }
  return (
    <div className="webinar-card__date">
      <span className="webinar-card__date-month">{formatDate(startsAt, { month: 'short' })}</span>
      <span className="webinar-card__date-day">{formatDate(startsAt, { day: 'numeric' })}</span>
    </div>
  );
}
