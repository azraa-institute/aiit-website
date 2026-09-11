import { Section } from '@/components/primitives/Section';
import { NewsletterForm } from '@/components/common/NewsletterForm';
import './newsletter-band.css';

export function NewsletterBand() {
  return (
    <Section tone="ink" size="tight" className="newsletter-band-section">
      <div className="container container--wide">
        <div className="newsletter-band" data-reveal>
          <div className="newsletter-band__text">
            <h2 className="newsletter-band__title">Subscribe our newsletter</h2>
            <p className="newsletter-band__sub">
              Get our updates via your mailbox by subscribing to our newsletters.
            </p>
          </div>
          <NewsletterForm className="newsletter-band__form" />
        </div>
      </div>
    </Section>
  );
}
