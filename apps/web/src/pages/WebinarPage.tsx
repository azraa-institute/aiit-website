import { useState } from 'react';
import type { FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo, organizationLd } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { FEATURED_WEBINAR, LIVE_EVENTS, WEBINAR_WHY_ATTEND } from '@/data/webinars';
import { Section } from '@/components/primitives/Section';
import { Plate } from '@/components/primitives/Plate';
import { Countdown } from '@/components/common/Countdown';
import { Button } from '@/components/primitives/Button';
import { TextField, SelectField } from '@/components/common/Field';
import { Turnstile } from '@/components/common/Turnstile';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import './webinar-page.css';

const KIND_LABEL: Record<string, string> = {
  webinar: 'Webinar',
  workshop: 'Workshop',
  masterclass: 'Masterclass',
  'info-session': 'Info session',
  event: 'Event',
};

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
      <PageBanner eyebrow="Free live webinar · Seats limited" title={w.title} intro={w.summary} />

      <Section tone="paper" size="default">
        <div className="container container--wide">
          <div className="webinar-page__feature" data-reveal>
            <div className="webinar-page__feature-body">
              <span className="tag tag--live">Free live webinar</span>
              <p className="webinar-page__desc">{w.description}</p>

              <dl className="webinar-page__facts">
                <div>
                  <dt>When</dt>
                  <dd>{w.scheduleNote}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{w.durationLabel}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>{w.platform}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{w.language}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>Completely Free</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{w.timezoneNote}</dd>
                </div>
              </dl>
              <p className="webinar-page__meta-line">
                No registration fee · Certificate-track guidance included · Runs 60–90 minutes
              </p>

              <div className="webinar-page__countdown">
                <Countdown startsAt={w.startsAt} fallback="Date to be announced" />
              </div>
            </div>
            <Plate source={w.image} seed={`webinar-page-${w.id}`} motif="signal" ratio={3 / 4} className="webinar-page__feature-media" alt="" />
          </div>

          <div className="webinar-page__agenda" data-reveal>
            <h2>Three high-demand tech fields, one live session</h2>
            <p className="webinar-page__agenda-intro">
              A practical, beginner-friendly overview of where the opportunities are, and how AIIT
              helps you get there.
            </p>
            <div className="webinar-page__agenda-grid">
              {w.agenda.map((a, i) => (
                <div key={a.title}>
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
          </div>

          <div className="webinar-page__audience" data-reveal>
            <h2>Who should attend</h2>
            <ul>
              {w.audience.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="webinar-page__audience" data-reveal>
            <h2>Why attend this free webinar</h2>
            <ul>
              {WEBINAR_WHY_ATTEND.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="register" tone="ink" size="lg">
        <div className="container container--wide">
          <div className="webinar-page__register" data-reveal>
            <div className="webinar-page__register-text">
              <h2>Register in a minute.</h2>
              <p>
                You&apos;ll receive the exact date, time and joining link by email or WhatsApp once
                the session is scheduled. {w.seatsLimited && 'Seats are limited.'}
              </p>
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
                  Reserve my seat
                </Button>
              </form>
            )}
          </div>
        </div>
      </Section>

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
