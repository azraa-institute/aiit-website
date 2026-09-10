import { useState } from 'react';
import type { FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo } from '@/lib/Seo';
import { SITE } from '@/data/site';
import { Button } from '@/components/primitives/Button';
import { TextField, TextArea, SelectField } from '@/components/common/Field';
import { SocialLinks } from '@/components/common/SocialLinks';
import './contact-page.css';

export default function ContactPage() {
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(true);
  }

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
                <div className="contact-page__row">
                  <TextField label="Full name" name="name" required autoComplete="name" />
                  <TextField label="Email" name="email" type="email" required autoComplete="email" />
                </div>
                <SelectField
                  label="What is this about?"
                  name="topic"
                  required
                  options={[
                    { value: '', label: 'Choose a topic' },
                    { value: 'course', label: 'A specific course' },
                    { value: 'enrolment', label: 'Enrolment & payment' },
                    { value: 'blueprint', label: 'AIIT Blueprint / global pathways' },
                    { value: 'webinar', label: 'Webinars & events' },
                    { value: 'partnership', label: 'Partnership or bulk enrolment' },
                    { value: 'other', label: 'Something else' },
                  ]}
                />
                <TextArea label="Message" name="message" required rows={5} />
                <Button as="button" type="submit" size="lg" arrow>
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
