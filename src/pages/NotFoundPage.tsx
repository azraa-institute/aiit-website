import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { Button } from '@/components/primitives/Button';

export default function NotFoundPage() {
  return (
    <Layout>
      <Seo title="Page not found" noindex />
      <div
        className="section container container--wide"
        style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-5)' }}
      >
        <p className="eyebrow">Error 404</p>
        <h1 className="display-2">This page took a different path.</h1>
        <p className="lead">The address doesn&apos;t match anything on AIIT. It may have moved, or never existed.</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button as="link" to="/" arrow>
            Back to home
          </Button>
          <Button as="link" to="/courses" variant="secondary">
            Browse courses
          </Button>
        </div>
      </div>
    </Layout>
  );
}
