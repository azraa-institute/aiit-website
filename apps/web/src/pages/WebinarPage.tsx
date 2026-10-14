import { useState } from 'react';
import type { FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo, organizationLd } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { FEATURED_WEBINAR, LIVE_EVENTS, WEBINAR_WHY_ATTEND } from '@/data/webinars';
import type { Webinar } from '@/data/types';
import { Section, SectionHeading } from '@/components/primitives/Section';
import { Plate } from '@/components/primitives/Plate';
import { Countdown } from '@/components/common/Countdown';
import { Button } from '@/components/primitives/Button';
import { TextField, SelectField } from '@/components/common/Field';
import { Turnstile } from '@/components/common/Turnstile';
import { apiFetch } from '@/lib/api';
import { assetUrl } from '@/lib/assetUrl';
import { cn } from '@/lib/cn';
import './webinar-page.css';

const KIND_LABEL: Record<string, string> = {
  webinar: 'Webinar',
  workshop: 'Workshop',
  masterclass: 'Masterclass',
  'info-session': 'Info session',
  event: 'Event',
};

/** The compact facts strip under the hero intro -- Section D/H's fuller event-details list pulls from the exact same `w` fields, never a second hardcoded copy. */
function MetaRow({ w }: { w: Webinar }) {
  return (
    <ul className="webinar-page__meta-row" role="list">
      <li>Free live webinar</li>
      <li>{w.durationLabel}</li>
      <li>{w.language}</li>
      <li>Online · {w.platform}</li>
      <li>{w.scheduleNote}</li>
    </ul>
  );
}

export default function WebinarPage() {
  const w = FEATURED_WEBINAR;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [region, setRegion] = useState('');
  const [persona, setPersona] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  useScrollReveal();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await apiFetch('/webinar-registrations', {
        method: 'POST',
        body: JSON.stringify({
          webinarSlug: w.slug,
          name,
          email,
          whatsapp: whatsapp || undefined,
          region,
          persona,
          turnstileToken,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register you. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && region.length > 0 && persona.length > 0 && turnstileToken.length > 0;

  return (
    <Layout>
      <Seo
        title="Live at AIIT"
        description={w.summary}
        path="/webinar"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: w.title,
          description: w.summary,
          eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled',
          organizer: organizationLd(),
          ...(w.startsAt ? { startDate: w.startsAt } : {}),
        }}
      />

      {/* B — Title and introduction */}
      <PageBanner eyebrow={w.kicker} title={w.title} intro={w.summary} titleWidth="wide" />
      <Section tone="paper" size="tight" className="webinar-page__meta-section">
        <div className="container container--wide">
          <MetaRow w={w} />
        </div>
      </Section>

      {/* C — Full-width, independent video */}
      <Section tone="paper" size="tight" className="webinar-page__video-section">
        <div className="container container--wide">
          <div className="webinar-page__video-frame" data-reveal>
            {w.videoUrl ? (
              <video
                className="webinar-page__video"
                src={w.videoUrl}
                poster={w.videoThumbnail ? assetUrl(w.videoThumbnail) : undefined}
                controls
                preload="metadata"
                playsInline
                aria-label={`${w.title} — webinar introduction video`}
              />
            ) : (
              <div className="webinar-page__video-placeholder" role="img" aria-label="Webinar introduction video coming soon">
                <span>Webinar introduction coming soon.</span>
              </div>
            )}
          </div>
          <p className="webinar-page__video-caption">
            Get a preview of the fields, skills and opportunities covered in this live session.
          </p>
        </div>
      </Section>

      {/* D — Primary registration CTA */}
      <Section tone="paper" size="tight" hairline className="webinar-page__cta-section">
        <div className="container container--wide">
          <div className="webinar-page__cta-primary" data-reveal>
            <Button as="link" to="/webinar#register" variant="primary" size="lg" arrow>
              Reserve My Free Seat
            </Button>
            <p className="webinar-page__cta-reassurance">Free to attend · Online · Beginner-friendly</p>
          </div>
        </div>
      </Section>

      {/* E — The three technology fields */}
      <Section tone="paper" size="default" hairline>
        <div className="container container--wide">
          <SectionHeading
            align="start"
            title="Three high-demand technology fields. One live session."
            intro="Understand the fundamentals, explore real-world applications, and discover where each field can take you."
          />
          <div className="webinar-page__agenda-grid">
            {w.agenda.map((a, i) => (
              <div key={a.title} data-reveal>
                <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{a.title}</h3>
                <ul>
                  {a.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Button as="link" to="/webinar#register" variant="secondary" arrow>
            Register for this session
          </Button>
        </div>
      </Section>

      {/* F — Who should attend */}
      <Section tone="ivory" size="default" hairline>
        <div className="container container--wide">
          <SectionHeading align="start" title="Who should attend" />
          <ul className="webinar-page__plain-list" role="list">
            {w.audience.map((a) => (
              <li key={a} data-reveal>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* G — What attendees will gain */}
      <Section tone="paper" size="default" hairline>
        <div className="container container--wide">
          <SectionHeading align="start" title="What you'll gain from attending" />
          <ul className="webinar-page__plain-list" role="list">
            {WEBINAR_WHY_ATTEND.map((a) => (
              <li key={a} data-reveal>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* H — Event details, flyer, and final CTA */}
      <Section id="register" tone="ink" size="lg">
        <div className="container container--wide">
          <div className="webinar-page__register" data-reveal>
            <div className="webinar-page__register-text">
              <h2>Your next step in technology starts here.</h2>
              <p>Join AIIT for a practical introduction to the technologies shaping modern industries.</p>

              <dl className="webinar-page__facts">
                <div>
                  <dt>Format</dt>
                  <dd>Online live webinar</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>{w.platform}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{w.durationLabel}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{w.language}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>Completely free</dd>
                </div>
                <div>
                  <dt>Date and time</dt>
                  <dd>{w.scheduleNote}</dd>
                </div>
              </dl>

              <div className="webinar-page__countdown">
                <Countdown startsAt={w.startsAt} fallback="Date to be announced" />
              </div>

              <div className="webinar-page__flyer">
                <p className="webinar-page__flyer-label">Event flyer</p>
                <Plate
                  source={w.image}
                  seed={`webinar-page-flyer-${w.id}`}
                  motif="signal"
                  tone="ink"
                  fit="natural"
                  alt=""
                />
              </div>
            </div>

            {done ? (
              <div className="webinar-page__done">
                <p className="heading">You&apos;re registered.</p>
                <p>
                  Look out for a confirmation, then the joining details closer to the date. In the
                  meantime, explore the courses these topics lead into.
                </p>
                <Button as="link" to="/courses" variant="secondary">
                  Browse courses
                </Button>
              </div>
            ) : (
              <form className="webinar-page__form" onSubmit={onSubmit}>
                <p className="webinar-page__form-kicker">Register for the Free Webinar</p>
                {w.seatsLimited && <p className="webinar-page__seats-note">Seats are limited.</p>}
                {error ? (
                  <p className="auth__alert" role="alert">
                    {error}
                  </p>
                ) : null}
                <TextField
                  label="Full name"
                  name="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  label="Email address"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="WhatsApp number"
                  name="whatsapp"
                  hint="Optional, for the joining link"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
                <SelectField
                  label="Where are you joining from?"
                  name="region"
                  options={[
                    { value: '', label: 'Select a region' },
                    { value: 'west-africa', label: 'West Africa' },
                    { value: 'east-africa', label: 'East Africa' },
                    { value: 'southern-africa', label: 'Southern Africa' },
                    { value: 'south-asia', label: 'South Asia' },
                    { value: 'southeast-asia', label: 'Southeast Asia' },
                    { value: 'other', label: 'Elsewhere' },
                  ]}
                  required
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
                <SelectField
                  label="What describes you best?"
                  name="persona"
                  options={[
                    { value: '', label: 'Select one' },
                    { value: 'student', label: 'Student or recent graduate' },
                    { value: 'professional', label: 'Working professional' },
                    { value: 'career-changer', label: 'Career-changer' },
                    { value: 'enthusiast', label: 'Technology enthusiast' },
                    { value: 'partner', label: 'Organisation or partner' },
                  ]}
                  required
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                />
                <Turnstile onVerify={setTurnstileToken} />
                <Button as="button" type="submit" size="lg" fullWidth arrow loading={submitting} disabled={!canSubmit}>
                  Register for the Free Webinar
                </Button>
              </form>
            )}
          </div>
        </div>
      </Section>

      {/* More live at AIIT */}
      <Section tone="paper" size="default" hairline>
        <div className="container container--wide">
          <h2 className="webinar-page__events-title">More live at AIIT</h2>
          <ul className="webinar-page__events" role="list">
            {LIVE_EVENTS.map((e) => (
              <li key={e.id} data-reveal>
                <div className="webinar-page__event-kind">{KIND_LABEL[e.kind]}</div>
                <div className="webinar-page__event-body">
                  <h3>{e.title}</h3>
                  <p>{e.summary}</p>
                  <span className="webinar-page__event-meta">
                    {e.scheduleNote}
                    {e.speaker && ` · ${e.speaker}`}
                  </span>
                </div>
                <div className="webinar-page__event-action">
                  <span className={cn('tag', e.registrationOpen ? 'tag--accent' : '')}>
                    {e.registrationOpen ? 'Registration open' : 'Announced to members first'}
                  </span>
                  {e.registrationOpen && (
                    <Button as="link" to="/webinar#register" variant="link">
                      Register
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </Layout>
  );
}
