import type { CourseTechnology } from '@/data/types';
import { TechIcon } from './TechIcons';

/**
 * The course-detail page's "What you'll explore" section -- a restrained
 * row of icon + name chips naming the real platforms/tools/concepts a
 * programme actually covers, split into what the curriculum centers on
 * ("core") and what it also touches ("also explored"). Reuses the same
 * pill treatment as the site's other tag chips (course-detail.css's
 * .course-detail__tech-* rules sit right next to the old .course-detail__tools
 * ones they replace) rather than introducing a new visual language --
 * small, monochrome by default, never larger than the label it sits beside.
 */
export function TechnologyList({ technologies }: { technologies: CourseTechnology[] }) {
  if (technologies.length === 0) return null;

  const core = technologies.filter((t) => (t.tier ?? 'core') === 'core');
  const optional = technologies.filter((t) => t.tier === 'optional');

  return (
    <section data-reveal>
      <h2 className="course-detail__h2">What you&apos;ll explore</h2>
      <ul className="course-detail__tech-list">
        {core.map((t) => (
          <TechChip key={t.name} tech={t} />
        ))}
      </ul>
      {optional.length > 0 && (
        <>
          <p className="course-detail__tech-note">Also explored</p>
          <ul className="course-detail__tech-list course-detail__tech-list--optional">
            {optional.map((t) => (
              <TechChip key={t.name} tech={t} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function TechChip({ tech }: { tech: CourseTechnology }) {
  return (
    <li className="course-detail__tech-chip" title={tech.name}>
      <span className="course-detail__tech-icon" aria-hidden="true">
        <TechIcon icon={tech.icon} />
      </span>
      <span>{tech.name}</span>
    </li>
  );
}
