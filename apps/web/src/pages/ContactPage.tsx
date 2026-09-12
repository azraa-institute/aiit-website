import { useState } from 'react';
import type { FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo } from '@/lib/Seo';
import { SITE } from '@/data/site';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/primitives/Button';
import { TextField, TextArea, SelectField } from '@/components/common/Field';
import { SocialLinks } from '@/components/common/SocialLinks';
import { Turnstile } from '@/components/common/Turnstile';
import './contact-page.css';

const TOPICS = [
  { value: '', label: 'Choose a topic' },
  { value: 'course', label: 'A specific course' },
  { value: 'enrolment', label: 'Enrolment & payment' },
  { value: 'blueprint', label: 'AIIT Blueprint / global pathways' },
  { value: 'webinar', label: 'Webinars & events' },
  { value: 'partnership', label: 'Partnership or bulk enrolment' },
  { value: 'other', label: 'Something else' },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await apiFetch('/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, topic, message, turnstileToken }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && topic.length > 0 && message.trim().length > 0 && turnstileToken.length > 0;

  return (
    <Layout>
      <Seo
        title="Contact"
        description="Talk to the AIIT team about courses, enrolment, payment options, partnerships or the AIIT Blueprint."
        path="/contact"
      />
      <PageBanner
        eyebrow="Contact"
        title="Talk to AIIT."
        intro="Questions about a course, enrolment, local payment options, partnerships or global pathways, we answer properly."
      />

      <div className="section container container--wide">
        <div className="contact-page">
          <div className="contact-page__form-wrap">
            {done ? (
              <div className="contact-page__done">
                <p className="heading">Message sent.</p>
                <p>
                  We reply within one working day, {SITE.contact.hours.toLowerCase()}. For anything
                  urgent, email{' '}
                  <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>.
                </p>
              </div>
            ) : (
              <form className="contact-page__form" onSubmit={onSubmit}>
                {error ? (
                  <p className="auth__alert" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="contact-page__row">
                  <TextField
                    label="Full name"
                    name="name"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <SelectField
                  label="What is this about?"
                  name="topic"
                  required
                  options={TOPICS}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <TextArea
                  label="Message"
                  name="message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Turnstile onVerify={setTurnstileToken} />
                <Button as="button" type="submit" size="lg" arrow loading={submitting} disabled={!canSubmit}>
                  Send message
                </Button>
              </form>
            )}
          </div>

          <aside className="contact-page__details">
            <div>
              <h2>Email</h2>
              <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
            </div>
            <div>
              <h2>Phone</h2>
              <a href={`tel:${SITE.contact.phoneHref}`}>{SITE.contact.phone}</a>
            </div>
            <div>
              <h2>Office</h2>
              <address>
                {SITE.contact.street}
                <br />
                {SITE.contact.city}, {SITE.contact.region} {SITE.contact.postalCode}
                <br />
                {SITE.contact.country}
              </address>
            </div>
            <div>
              <h2>Hours</h2>
              <p>{SITE.contact.hours}</p>
            </div>
            <div>
              <h2>Follow</h2>
              <SocialLinks className="contact-page__social" />
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
