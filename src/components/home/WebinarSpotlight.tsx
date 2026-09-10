import { Link } from 'react-router-dom';
import { FEATURED_WEBINAR } from '@/data/webinars';
import { Section } from '@/components/primitives/Section';
import { Plate } from '@/components/primitives/Plate';
import { Countdown } from '@/components/common/Countdown';
import { Button } from '@/components/primitives/Button';
import './webinar-spotlight.css';

export function WebinarSpotlight() {
  const w = FEATURED_WEBINAR;
  return (
    <Section id="webinar" tone="ink" size="lg">
      <div className="container container--wide">
        <div className="webinar-spot" data-reveal>
          <div className="webinar-spot__text">
            <p className="eyebrow eyebrow--plain">
              <span className="tag tag--live">Live at AIIT</span>
            </p>
            <h2 className="webinar-spot__title">{w.heroHeadline}</h2>
            <p className="webinar-spot__summary">{w.summary}</p>

            <dl className="webinar-spot__facts">
              <div>
                <dt>When</dt>
                <dd>{w.scheduleNote}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>
                  {w.durationLabel} · {w.platform}
                </dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>Completely free</dd>
              </div>
              <div>
                <dt>Timing</dt>
                <dd>{w.timezoneNote}</dd>
              </div>
            </dl>

            <div className="webinar-spot__countdown">
              <Countdown startsAt={w.startsAt} fallback="Date announced to registrants first" />
            </div>

            <div className="webinar-spot__actions">
              <Button as="link" to="/webinar#register" size="lg" arrow>
                Register for the webinar
              </Button>
              <Button as="link" to="/webinar" variant="secondary" size="lg">
                Learn more
              </Button>
            </div>
            {w.seatsLimited && <p className="webinar-spot__seats">Limited seats, registration closes when full.</p>}
          </div>

          <div className="webinar-spot__visual">
            <Plate source={w.image} seed={`webinar-${w.id}`} motif="signal" tone="ink" ratio={3 / 4} />
            <ul className="webinar-spot__agenda" role="list">
              {w.agenda.map((a) => (
                <li key={a.title}>{a.title}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="webinar-spot__more">
          <Link to="/webinar">See all upcoming webinars, workshops and masterclasses →</Link>
        </p>
      </div>
    </Section>
  );
}
