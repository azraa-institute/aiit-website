import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageBanner } from '@/components/layout/PageBanner';
import { Seo, organizationLd } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { SITE } from '@/data/site';
import { ABOUT_BLOCKS } from '@/data/ecosystem';
import { PRIMARY_DOMAINS } from '@/data/technologies';
import { Section, SectionHeading } from '@/components/primitives/Section';
import { LearningEcosystem } from '@/components/home/LearningEcosystem';
import { Button } from '@/components/primitives/Button';
import './about-page.css';

export default function AboutPage() {
  useScrollReveal();
  return (
    <Layout>
      <Seo title="About Us" description={SITE.mission} path="/about" jsonLd={organizationLd()} />
      <PageBanner eyebrow="Welcome to AIIT" title="Azraa Institute of Information Technology" intro={SITE.blurb} />

      <Section tone="paper" size="lg">
        <div className="container container--wide about-page__intro">
          <img
            src="/assets/about/aiit-about-us.webp"
            alt="AIIT students and instructors learning together"
            className="about-page__photo"
            loading="lazy"
            data-reveal
          />
          <div data-reveal>
            <p className="about-page__mission-text">{SITE.mission}</p>
            <div className="about-page__cta-row">
              <Button as="link" to="/courses" arrow>
                Explore Courses
              </Button>
              <Button as="link" to="/contact" variant="secondary">
                Contact Us
              </Button>
            </div>
            <p className="about-page__global">
              <strong>Online. Global.</strong> Learners worldwide. We help learners build practical
              skills in Artificial Intelligence, Data Science, Cloud Computing, Quantum Computing,
              Edge Computing and other future-ready technologies.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="ivory" size="lg">
        <div className="container container--wide">
          {ABOUT_BLOCKS.slice(0, 2).map((b) => (
            <div className="about-page__block" key={b.title} data-reveal>
              <p className="eyebrow">{b.kicker}</p>
              <h2>{b.title}</h2>
              <p>{b.body}</p>
            </div>
          ))}

          <ul className="about-page__domains" role="list" data-reveal>
            {PRIMARY_DOMAINS.map((d) => (
              <li key={d.id}>
                <Link to={`/courses?domain=${d.slug}`}>{d.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <LearningEcosystem />

      <Section tone="ink" size="lg">
        <div className="container container--wide about-page__final" data-reveal>
          <SectionHeading
            eyebrow={ABOUT_BLOCKS[2].kicker}
            title="Ready to start learning with AIIT?"
            intro={ABOUT_BLOCKS[2].body}
          />
          <Button as="link" to="/courses" size="lg" arrow>
            Browse Courses
          </Button>
        </div>
      </Section>
    </Layout>
  );
}
