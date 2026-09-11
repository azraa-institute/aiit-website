import { Link } from 'react-router-dom';
import { SITE } from '@/data/site';
import { FOOTER_QUICK_LINKS, FOOTER_POPULAR_COURSES, FOOTER_NAV } from '@/data/navigation';
import { SocialLinks } from '@/components/common/SocialLinks';
import { Logo } from './Logo';
import './footer.css';

export function Footer() {
  return (
    <footer className="site-footer on-ink">
      <div className="container container--wide">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo variant="light" className="aiit-logo--lg" />
            <p className="site-footer__blurb">{SITE.blurb}</p>
            <p className="site-footer__progression">{SITE.advantageLine}</p>
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
                      src={l.image}
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
              <ul role="list">
                <li>{SITE.contact.addressLine}</li>
                <li>
                  Tel.: <a href={`tel:${SITE.contact.phoneHref}`}>{SITE.contact.phone}</a>
                </li>
                <li>
                  <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
                </li>
                <li>{SITE.contact.hours}</li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p>{SITE.copyright}</p>
          <div className="site-footer__meta">
            <div className="site-footer__legal">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms">Terms and Conditions</Link>
            </div>
            <SocialLinks className="social-links--footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
