import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/lib/Seo';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useInView } from '@/lib/useInView';
import {
  WHY_JOIN_HEADING,
  WHY_JOIN_INTRO,
  WHY_JOIN_SUBHEAD,
  WHY_JOIN_SUB_INTRO,
  WHY_JOIN_REASONS,
} from '@/data/ecosystem';
import { SITE } from '@/data/site';
import { COURSES } from '@/data/courses';
import { COURSE_CATEGORIES } from '@/data/technologies';
import { Section } from '@/components/primitives/Section';
import { Button } from '@/components/primitives/Button';
import { REASON_ICONS } from './WhyJoinIcons';
import type { ReasonIcon } from './WhyJoinIcons';
import './why-join-page.css';

/** The six technology disciplines — the same set previously shown as
 * emoji pills, now an editorial course index (see .wj-hero__discipline*
 * in why-join-page.css). Purely decorative, same as before (no route). */
const DISCIPLINES = ['AI Engineering', 'Data Science', 'Cyber Security', 'Cloud Computing', 'Blockchain', 'Cisco CCNA'];

const TRACK_SLUGS = [
  'ai-engineering-associate-ai-engineer',
  'data-science-and-analytics',
  'generative-ai-and-large-language-models-llms',
  'ethical-hacking-and-cyber-security',
  'cisco-ccna-cisco-certified-network-associate',
  'cloud-computing-fundamentals',
  'edge-computing',
  'blockchain-technology',
];

/** Icon per WHY_JOIN_REASONS entry, in the same 01–07 order. */
const REASON_ICON_ORDER: ReasonIcon[] = [
  'courses',
  'fees',
  'flexible',
  'certification',
  'support',
  'community',
  'guidance',
];

/** Splits WHY_JOIN_HEADING at "Because" so the functional question and the
 * emotional statement can carry different typographic weight — the exact
 * same words, just two treatments of one sentence. Falls back to the whole
 * string untouched if the marker isn't found. */
function splitHeading(text: string) {
  const marker = 'Because';
  const i = text.indexOf(marker);
  if (i === -1) return { lead: text, emphasis: '' };
  return { lead: text.slice(0, i).trim(), emphasis: text.slice(i).trim() };
}

export default function WhyJoinPage() {
  useScrollReveal();
  const tracks = TRACK_SLUGS.map((s) => COURSES.find((c) => c.slug === s)).filter(Boolean);
  const { lead, emphasis } = splitHeading(WHY_JOIN_HEADING);
  const [heroRef, heroActive] = useInView<HTMLDivElement>(0.2);

  return (
    <Layout>
      <Seo title="Why Join AIIT" description={WHY_JOIN_INTRO} path="/why-join" />

      {/* ---------- 01 · Hero ---------- */}
      <Section tone="ink" size="lg" className="wj-hero">
        <div className="wj-hero__atmosphere" aria-hidden="true" />
        <div className="container container--wide wj-hero__grid" ref={heroRef}>
          <div className="wj-hero__copy" data-reveal>
            <p className="wj-hero__eyebrow eyebrow">
              <span className="wj-hero__dot" aria-hidden="true" />
              Limited seats available
            </p>
            <h1 className="wj-hero__heading">
              <span className="wj-hero__lead">{lead}</span>{' '}
              {emphasis && <span className="wj-hero__emphasis">{emphasis}</span>}
            </h1>
            <p className="wj-hero__intro">{WHY_JOIN_INTRO}</p>
            <div className="wj-hero__cta-row">
              <Button as="link" to="/register" size="lg" arrow>
                Register now
              </Button>
              <Button as="link" to="/courses" variant="secondary">
                Explore courses
              </Button>
            </div>
          </div>

          <div className="wj-hero__disciplines" data-active={heroActive ? '' : undefined} aria-hidden="true">
            <p className="wj-hero__disciplines-label eyebrow">Technology disciplines</p>
            <ol className="wj-hero__discipline-list">
              {DISCIPLINES.map((name, i) => (
                <li key={name} className="wj-hero__discipline" style={{ '--i': i } as React.CSSProperties}>
                  <span className="wj-hero__discipline-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="wj-hero__discipline-name">
                    <span className="wj-hero__discipline-name-inner">{name}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* ---------- 02 · Seven reasons — the AIIT Advantage Map ---------- */}
      <Section tone="paper" size="lg">
        <div className="container container--wide">
          <p className="eyebrow" data-reveal>
            Why AIIT
          </p>
          <h2 className="wj-reasons__heading" data-reveal>
            {WHY_JOIN_SUBHEAD}
          </h2>
          <p className="wj-reasons__intro" data-reveal>
            {WHY_JOIN_SUB_INTRO}
          </p>

          <ol className="wj-reasons" role="list">
            {WHY_JOIN_REASONS.map((r, i) => (
              <li
                key={r.index}
                className={i % 2 === 1 ? 'wj-reasons__row on-ink' : 'wj-reasons__row'}
                data-panel={i % 2 === 1 ? '' : undefined}
                data-reveal
                style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
                tabIndex={0}
              >
                <span className="wj-reasons__index">{r.index}</span>
                <span className="wj-reasons__icon">{REASON_ICONS[REASON_ICON_ORDER[i]]}</span>
                <span className="wj-reasons__body">
                  <span className="wj-reasons__kicker">{r.kicker}</span>
                  <span className="wj-reasons__title">{r.title}</span>
                  <span className="wj-reasons__text">{r.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------- 03 · Certification tracks — the Certification Atlas ---------- */}
      <Section tone="ivory" size="lg">
        <div className="container container--wide">
          <p className="eyebrow" data-reveal>
            Certification tracks
          </p>
          <h2 className="wj-reasons__heading" data-reveal>
            Explore our certification tracks
          </h2>
          <p className="wj-reasons__intro" data-reveal>
            Online. Project-based. Built for beginners through intermediate learners.
          </p>

          <ol className="wj-tracks" role="list">
            {tracks.map((c, i) => {
              const category = COURSE_CATEGORIES.find((cat) => cat.id === c!.categoryId)?.name;
              return (
                <li key={c!.id} data-reveal style={{ '--reveal-delay': `${i * 45}ms` } as React.CSSProperties}>
                  <Link to={`/courses/${c!.slug}`} className="wj-tracks__row">
                    <span className="wj-tracks__index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="wj-tracks__names">
                      <span className="wj-tracks__title">{c!.title}</span>
                      {category && <span className="wj-tracks__category">{category}</span>}
                    </span>
                    <span className="wj-tracks__cta">
                      View course
                      <svg width="18" height="11" viewBox="0 0 18 11" aria-hidden="true">
                        <path
                          d="M1 5.5h15M11.5 1l5 4.5-5 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="wj-tracks__all">
            <Button as="link" to="/courses" variant="secondary" arrow>
              See all courses
            </Button>
          </p>
        </div>
      </Section>

      {/* ---------- 04 · Final CTA ---------- */}
      <Section tone="ink" size="lg" className="wj-final">
        <div className="wj-final__atmosphere" aria-hidden="true" />
        <div className="container container--wide wj-final__inner" data-reveal>
          <p className="wj-final__tagline">{SITE.advantageLine}</p>
          <h2 className="wj-final__heading">
            Your future has a <em>source code.</em> Start writing it today.
          </h2>
          <p className="wj-final__body">
            Join thousands of learners across Africa, Asia and beyond building global tech careers
            with AIIT.
          </p>
          <Button as="link" to="/register" size="lg" arrow className="wj-final__cta">
            Register now
          </Button>
        </div>
      </Section>
    </Layout>
  );
}
