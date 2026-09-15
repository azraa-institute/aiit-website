import { Link } from 'react-router-dom';
import { SITE } from '@/data/site';
import { FOOTER_QUICK_LINKS, FOOTER_POPULAR_COURSES, FOOTER_NAV } from '@/data/navigation';
import { SocialLinks } from '@/components/common/SocialLinks';
import { NewsletterForm } from '@/components/common/NewsletterForm';
import { assetUrl } from '@/lib/assetUrl';
import { useCookieConsent } from '@/lib/CookieConsentContext';
import { Logo } from './Logo';
import { FooterNetworkGraphic } from './FooterNetworkGraphic';
import {
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  ClockIcon,
  GraduationCapIcon,
  GlobeIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from './FooterIcons';
import './footer.css';

const HIGHLIGHTS = [
  { icon: GraduationCapIcon, title: 'Industry-relevant learning', body: 'Skills for real-world opportunities' },
  { icon: GlobeIcon, title: 'Learn from anywhere', body: 'A global learning community' },
  { icon: ShieldCheckIcon, title: 'Certified progress', body: 'Build credentials that matter' },
];

const NETWORK_LABELS = ['Technology', 'People', 'Opportunity', 'Without borders'];

export function Footer() {
  const { openPreferences } = useCookieConsent();
  return (
    <footer className="site-footer on-ink">
      <div className="container container--wide">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo variant="light" className="aiit-logo--lg" />
            <p className="site-footer__blurb">{SITE.blurb}</p>
            <p className="site-footer__progression">{SITE.advantageLine}</p>
            <div className="site-footer__brand-rule" aria-hidden="true" />
            <SocialLinks className="social-links--footer" />
          </div>

          <nav className="site-footer__cols" aria-label="Footer">
            <div className="site-footer__col">
              <h3>Explore</h3>
              <ul role="list">
                {FOOTER_NAV.explore.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="site-footer__col site-footer__col--courses">
              <h3>Learning now</h3>
              <ul role="list">
                {FOOTER_POPULAR_COURSES.map((l) => (
                  <li key={l.label}>
                    <img
                      className="site-footer__thumb"
                      src={assetUrl(l.image)}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="site-footer__course-text">
                      <Link to={l.to}>{l.label}</Link>
                      <span className="site-footer__by">By AIIT Network</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/courses" className="site-footer__view-all">
                View all courses <ArrowRightIcon />
              </Link>
            </div>

            <div className="site-footer__col">
              <h3>Quick links</h3>
              <ul role="list">
                {FOOTER_QUICK_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="site-footer__col">
              <h3>Contact</h3>
              <ul role="list" className="site-footer__contact">
                <li>
                  <MapPinIcon />
                  <span>{SITE.contact.addressLine}</span>
                </li>
                <li>
                  <PhoneIcon />
                  <span className="site-footer__contact-tight">
                    Tel.: <a href={`tel:${SITE.contact.phoneHref}`}>{SITE.contact.phone}</a>
                  </span>
                </li>
                <li>
                  <MailIcon />
                  <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
                </li>
                <li>
                  <ClockIcon />
                  <span className="site-footer__contact-tight">{SITE.contact.hours}</span>
                </li>
              </ul>
            </div>

            <div className="site-footer__col site-footer__col--newsletter">
              <h3>Stay updated</h3>
              <p className="site-footer__newsletter-intro">
                Get the latest courses, webinars and announcements.
              </p>
              <NewsletterForm variant="compact" />
            </div>
          </nav>
        </div>

        <div className="site-footer__highlights">
          <ul className="site-footer__highlight-list" role="list">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span className="site-footer__highlight-icon">
                  <Icon />
                </span>
                <span>
                  <span className="site-footer__highlight-title">{title}</span>
                  <span className="site-footer__highlight-body">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="site-footer__network" aria-hidden="true">
            <FooterNetworkGraphic className="site-footer__network-art" />
          </div>
          <ul className="site-footer__network-labels" role="list" aria-hidden="true">
            {NETWORK_LABELS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>

        <div className="site-footer__bottom">
          <p>{SITE.copyright}</p>
          <div className="site-footer__legal">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms">Terms and Conditions</Link>
            <button type="button" className="site-footer__legal-btn" onClick={openPreferences}>
              Cookie Preferences
            </button>
          </div>
          <p className="site-footer__closer">
            A more open tomorrow
            <span aria-hidden="true" />
          </p>
        </div>
      </div>
    </footer>
  );
}
