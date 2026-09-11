import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PRIMARY_DOMAINS } from '@/data/technologies';
import { COURSES } from '@/data/courses';
import { Section, SectionHeading } from '@/components/primitives/Section';
import { DomainIcon } from './DomainIcons';
import { FocusVisual } from './FocusVisuals';
import { cn } from '@/lib/cn';
import './technology-domains.css';

const courseCount = (domainId: string) =>
  COURSES.filter((c) => c.domainId === domainId).length;

/**
 * "Our focus areas" — an interactive selector for the five primary domains,
 * paired with a glass visual panel that explains the selected one through a
 * bespoke technical illustration (see FocusVisuals.tsx). Hovering / focusing
 * a domain transforms the panel; adding a domain is a data change only.
 */
export function TechnologyDomains() {
  const [active, setActive] = useState(0);
  const domain = PRIMARY_DOMAINS[active];
  const domainCourses = courseCount(domain.id);

  return (
    <Section id="technologies" tone="ink" size="lg" className="tech-focus">
      <div className="tech-focus__atmosphere" aria-hidden="true" />
      <div className="container container--wide tech-focus__container">
        <SectionHeading
          align="start"
          eyebrow="Our focus areas"
          title="Future-ready technologies, taught practically"
          intro="We help learners build practical skills in Artificial Intelligence, Data Science, Cloud Computing, Quantum Computing and Edge Computing — the technologies shaping the next decade of work."
          className="tech-focus__heading"
        />

        <div className="tech-focus__body" data-reveal>
          <nav className="tech-focus__nav" aria-label="Focus areas">
            <ol className="tech-focus__list" role="list">
              {PRIMARY_DOMAINS.map((d, i) => (
                <li
                  key={d.id}
                  className={cn('tech-focus__item', i === active && 'is-active')}
                  data-domain={d.id}
                >
                  <button
                    type="button"
                    className={cn('tech-focus__btn', i === active && 'is-active')}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-current={i === active}
                  >
                    <span className="tech-focus__index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="tech-focus__icon">
                      <DomainIcon id={d.id} />
                    </span>
                    <span className="tech-focus__label">{d.name}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="tech-focus__panel">
            <div className="tech-focus__glass" data-domain={domain.id}>
              <div className="tech-focus__visual">
                <FocusVisual domainId={domain.id} />
              </div>
              <div className="tech-focus__detail" key={domain.id}>
                <p className="tech-focus__eyebrow">{domain.name}</p>
                <p className="tech-focus__tagline">{domain.tagline}</p>
                <p className="tech-focus__summary">{domain.summary}</p>
                {domainCourses > 0 ? (
                  <Link to={`/courses?domain=${domain.slug}`} className="btn btn--link">
                    <span className="btn__label">
                      Explore {domain.name} ({domainCourses})
                    </span>
                  </Link>
                ) : (
                  <p className="tech-focus__soon">Courses in this area are in development.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="tech-focus__more">
          <Link to="/courses">Browse the full course catalogue</Link>.
        </p>
      </div>
    </Section>
  );
}
