import { Link } from 'react-router-dom';
import { RESOURCES } from '@/data/resources';
import { Section, SectionHeading } from '@/components/primitives/Section';
import { Plate } from '@/components/primitives/Plate';
import { formatDate, pluralize } from '@/lib/format';
import './resources-teaser.css';

export function ResourcesTeaser() {
  const [lead, ...rest] = [...RESOURCES].sort((a, b) => (a.featured === b.featured ? 0 : a.featured ? -1 : 1));
  const list = rest.slice(0, 4);

  return (
    <Section id="resources" tone="ivory" size="lg">
      <div className="container container--wide">
        <div className="resources-teaser__head">
          <SectionHeading
            eyebrow="Insights & resources"
            title="AIIT.network Blog"
            intro="Guides, explainers, and career resources for learners exploring careers in tech."
          />
          <Link to="/resources" className="btn btn--link resources-teaser__all">
            <span className="btn__label">All resources</span>
          </Link>
        </div>

        <div className="resources-teaser__grid">
          <Link to={`/resources/${lead.slug}`} className="resources-teaser__lead" data-reveal>
            <Plate source={lead.image} seed={lead.slug} fit="natural" className="resources-teaser__lead-media" />
            <div className="resources-teaser__lead-body">
              <span className="resources-teaser__cat">{lead.category}</span>
              <h3>{lead.title}</h3>
              <p>{lead.excerpt}</p>
              <span className="resources-teaser__byline">
                {formatDate(lead.publishedAt, { day: 'numeric', month: 'short' })} ·{' '}
                {pluralize(lead.readMinutes, 'min')} read
              </span>
            </div>
          </Link>

          <ul className="resources-teaser__list" role="list">
            {list.map((r) => (
              <li key={r.id} data-reveal>
                <Link to={`/resources/${r.slug}`}>
                  <span className="resources-teaser__cat">{r.category}</span>
                  <h4>{r.title}</h4>
                  <span className="resources-teaser__byline">
                    {formatDate(r.publishedAt, { day: 'numeric', month: 'short' })} ·{' '}
                    {pluralize(r.readMinutes, 'min')} read
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
