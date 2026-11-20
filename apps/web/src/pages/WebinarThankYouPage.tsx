import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';
import { WEBINAR_WHATSAPP_GROUP_URL } from '@/data/webinars';

export default function WebinarThankYouPage() {
  return (
    <Layout>
      <Seo title="You're registered" path="/webinar/thank-you" noindex />
      <div
        className="section container container--wide"
        style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-5)' }}
      >
        <p className="eyebrow">Live at AIIT</p>
        <h1 className="display-2">You&apos;re registered.</h1>
        <p className="lead">
          Please click the button below to join our student group to receive updates, webinar link to
          meetings, latest news, course discount opportunities, etc.
        </p>
        <div>
          <Button as="a" href={WEBINAR_WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer" arrow>
            Join WhatsApp Group
          </Button>
        </div>
        <div>
          <Button as="link" to="/courses" variant="secondary">
            Browse courses
          </Button>
        </div>
      </div>
    </Layout>
  );
}
