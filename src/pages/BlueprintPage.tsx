import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useInView } from '@/lib/useInView';
import { useCountUpOnce } from '@/lib/useAnimatedNumber';
import { BLUEPRINT } from '@/data/blueprint';
import { Section, SectionHeading } from '@/components/primitives/Section';
import { Button } from '@/components/primitives/Button';
import { BlueprintPathway } from './BlueprintPathway';
import { PATHWAY_ICONS, JOURNEY_ICONS } from './BlueprintIcons';
import type { PathwayIcon, JourneyIcon } from './BlueprintIcons';
import './blueprint-page.css';

/** Mirrors BLUEPRINT.slogan ("Learn. Certify. Progress. Globalize.") — paired
 * here with an icon per stage for the pathway visualization. */
const PATHWAY_STAGES: { key: PathwayIcon; word: string }[] = [
  { key: 'learn', word: 'Learn' },
  { key: 'certify', word: 'Certify' },
  { key: 'progress', word: 'Progress' },
  { key: 'globalize', word: 'Globalize' },
];

/** Mirrors the list inside BLUEPRINT.blocks[2].body ("pathway planning,
 * university selection, SOPs, portfolios, scholarships, and visa
 * guidance") — paired here with an icon per stage. */
const JOURNEY_STAGES: { key: JourneyIcon; label: string }[] = [
  { key: 'planning', label: 'Pathway planning' },
  { key: 'university', label: 'University selection' },
  { key: 'sop', label: 'SOPs' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'scholarship', label: 'Scholarships' },
  { key: 'visa', label: 'Visa guidance' },
];

/** BLUEPRINT.sloganSub with "Study Globally." given an italic accent —
 * falls back to the plain string untouched if the phrase isn't found. */
function SloganSub({ text }: { text: string }) {
  const phrase = 'Study Globally.';
  const i = text.indexOf(phrase);
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <em>{phrase}</em>
      {text.slice(i + phrase.length)}
    </>
  );
}

export default function BlueprintPage() {
  useScrollReveal();
  const b = BLUEPRINT;
  const [hoveredDest, setHoveredDest] = useState<number | null>(null);

  const [heroRef, heroActive] = useInView<HTMLDivElement>(0.25);
  const [statsRef, statsActive] = useInView<HTMLDivElement>(0.6);
  const countries = useCountUpOnce(5, statsActive, 700);
  const tracks = useCountUpOnce(7, statsActive, 700);

  return (
    <Layout>
      <Seo title="AIIT Blueprint" description={b.intro} path="/aiit-blueprint" />

      {/* ---------- 01 · Hero ---------- */}
      <Section tone="ink" size="lg" className="blueprint-hero">
        <div className="blueprint-hero__atmosphere" aria-hidden="true" />
        <div className="container container--wide blueprint-hero__grid" ref={heroRef}>
          <div className="blueprint-hero__copy" data-reveal>
            <p className="eyebrow">{b.kicker}</p>
            <h1 className="blueprint-hero__title">
              Your gateway to{' '}
              <br />
              <span className="blueprint-hero__title-accent">Global</span> Higher Education
            </h1>
            <p className="blueprint-hero__intro">{b.intro}</p>
            <p className="blueprint-hero__intro">{b.intro2}</p>
            <div className="blueprint-hero__cta-row">
              <Button as="link" to={b.primaryCta.to} size="lg" arrow>
                {b.primaryCta.label}
              </Button>
              <Button as="link" to={b.secondaryCta.to} variant="secondary">
                {b.secondaryCta.label}
              </Button>
            </div>

            <div className="blueprint-stats" data-active={statsActive ? '' : undefined} ref={statsRef}>
              {b.stats.map((s, i) => (
                <div key={s.label} className="blueprint-stats__item">
                  <p className="blueprint-stats__value">
                    {String(i === 0 ? countries : tracks).padStart(2, '0')}
                  </p>
                  <p className="blueprint-stats__label">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="blueprint-hero__visual">
            <BlueprintPathway active={heroActive} />
          </div>
        </div>
      </Section>

      {/* ---------- 02 · Destinations ---------- */}
      <Section tone="ivory" size="lg">
        <div className="container container--wide">
          <p className="eyebrow">{b.destinationsHeading}</p>
          <ol className="blueprint-dest" role="list" onMouseLeave={() => setHoveredDest(null)}>
            {b.destinations.map((d, i) => (
              <li key={d.name} data-reveal style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}>
                <div
                  className="blueprint-dest__row"
                  style={{ opacity: hoveredDest === null || hoveredDest === i ? 1 : 0.5 }}
                  onMouseEnter={() => setHoveredDest(i)}
                  onFocus={() => setHoveredDest(i)}
                >
                  <img
                    className="blueprint-dest__photo"
                    src={d.image}
                    alt=""
                    width={640}
                    height={480}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="blueprint-dest__index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="blueprint-dest__name">{d.name}</span>
                  <span className="blueprint-dest__flag" aria-hidden="true">
                    {d.flag}
                  </span>
                  <svg className="blueprint-dest__arrow" width="20" height="12" viewBox="0 0 20 12" aria-hidden="true">
                    <path
                      d="M1 6h17M12 1l6 5-6 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------- 03 · Learn. Certify. Progress. Globalize. ---------- */}
      <Section tone="paper" size="lg">
        <div className="container container--wide">
          <SectionHeading eyebrow="The global pathway" title={b.slogan} align="start" />
          <ol className="blueprint-journey blueprint-journey--primary" role="list">
            {PATHWAY_STAGES.map((stage, i) => (
              <li
                className="blueprint-journey__stage"
                key={stage.key}
                data-reveal
                style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
              >
                <div className="blueprint-journey__content">
                  <span className="blueprint-journey__index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="blueprint-journey__icon">{PATHWAY_ICONS[stage.key]}</span>
                  <span className="blueprint-journey__word">{stage.word}</span>
                </div>
                {i < PATHWAY_STAGES.length - 1 && (
                  <span className="blueprint-journey__sep" aria-hidden="true">
                    <svg width="22" height="14" viewBox="0 0 22 14">
                      <path
                        d="M1 7h19M13 1l7 6-7 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="blueprint-journey__sub" data-reveal>
            <SloganSub text={b.sloganSub} />
          </p>
        </div>
      </Section>

      {/* ---------- 04 · Your foundation ---------- */}
      <Section tone="ivory" size="lg">
        <div className="container container--wide blueprint-foundation">
          <div className="blueprint-foundation__text" data-reveal>
            <p className="eyebrow">{b.blocks[0].kicker}</p>
            <h2 className="blueprint-section-title">{b.blocks[0].title}</h2>
            <p className="blueprint-section-body">{b.blocks[0].body}</p>
          </div>
          <div className="blueprint-foundation__diagram" data-reveal aria-hidden="true">
            <div className="blueprint-foundation__inputs">
              <span>AIIT certifications</span>
              <span>Project portfolio</span>
              <span>Practical skills</span>
            </div>
            <svg className="blueprint-foundation__connector" width="2" height="40" viewBox="0 0 2 40">
              <line x1="1" y1="0" x2="1" y2="40" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 4" />
            </svg>
            <div className="blueprint-foundation__outputs">
              <span>Higher education</span>
              <span>International careers</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- 05 · International study pathways ---------- */}
      <Section tone="paper" size="lg">
        <div className="container container--wide blueprint-foundation blueprint-foundation--reverse">
          <div className="blueprint-foundation__text" data-reveal>
            <p className="eyebrow">{b.blocks[1].kicker}</p>
            <h2 className="blueprint-section-title">{b.blocks[1].title}</h2>
            <p className="blueprint-section-body">{b.blocks[1].body}</p>
          </div>
          <div className="blueprint-fanout" data-reveal aria-hidden="true">
            <span className="blueprint-fanout__origin">AIIT</span>
            <span className="blueprint-fanout__line" />
            <div className="blueprint-fanout__chips">
              {b.destinations.map((d) => (
                <span key={d.name}>{d.flag}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- 06 · Special support for students ---------- */}
      <Section tone="ivory" size="lg">
        <div className="container container--wide">
          <p className="eyebrow">{b.blocks[2].kicker}</p>
          <h2 className="blueprint-section-title">{b.blocks[2].title}</h2>
          <p className="blueprint-section-body blueprint-section-body--wide">{b.blocks[2].body}</p>

          <ol className="blueprint-journey blueprint-journey--secondary" role="list">
            {JOURNEY_STAGES.map((stage, i) => (
              <li
                className="blueprint-journey__stage"
                key={stage.key}
                data-reveal
                style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
              >
                <div className="blueprint-journey__content">
                  <span className="blueprint-journey__icon blueprint-journey__icon--sm">
                    {JOURNEY_ICONS[stage.key]}
                  </span>
                  <span className="blueprint-journey__word blueprint-journey__word--sm">{stage.label}</span>
                </div>
                {i < JOURNEY_STAGES.length - 1 && (
                  <span className="blueprint-journey__sep blueprint-journey__sep--sm" aria-hidden="true">
                    <svg width="16" height="10" viewBox="0 0 22 14">
                      <path
                        d="M1 7h19M13 1l7 6-7 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------- 07 · Visa notice — deliberately its own visual world ---------- */}
      <section className="blueprint-notice">
        <div className="container container--text blueprint-notice__sheet" data-reveal>
          <p className="blueprint-notice__label">Editorial notice</p>
          <h2 className="blueprint-notice__title">{b.visaNote.title}</h2>
          <p className="blueprint-notice__body">{b.visaNote.body}</p>
        </div>
      </section>

      {/* ---------- 08 · Closing ---------- */}
      <Section tone="ink" size="lg">
        <div className="container container--wide blueprint__closing" data-reveal>
          <SectionHeading eyebrow={b.closing.tagline} title={b.closing.title} intro={b.closing.body} />
          <Button as="link" to={b.closing.cta.to} size="lg" arrow>
            {b.closing.cta.label}
          </Button>
        </div>
      </Section>
    </Layout>
  );
}
