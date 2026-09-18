import type { CourseTechnology } from '@/data/types';
import { TechIcon } from './TechIcons';
import { BrandLogo, brandLogoSlug } from './BrandIcons';

/**
 * The course-detail hero's "What you'll explore" row -- sits right under
 * the course summary, one horizontal, wrapping row of icon + name chips
 * naming the real platforms/tools/concepts the programme actually covers.
 * A technology whose name resolves to a real brand mark (see BrandIcons.tsx)
 * shows that; everything else (abstract concepts like "RAG" or "Tool
 * Calling", and the handful of real products Simple Icons doesn't carry --
 * OpenAI, AWS, Azure, IBM) falls back to the restrained generic icon set in
 * TechIcons.tsx, so every chip still carries some icon and the row reads as
 * one consistent system rather than a mix of "has a logo" / "doesn't".
 * `tier` ('optional' items are what the programme also touches, not what it
 * centers on) is kept as a subtle opacity difference rather than a second
 * section, since this is a single row, not a two-part list.
 */
export function TechnologyList({ technologies }: { technologies: CourseTechnology[] }) {
  if (technologies.length === 0) return null;

  return (
    <div className="course-hero-tech">
      <p className="course-hero-tech__label">What you&apos;ll explore</p>
      <ul className="course-hero-tech__list">
        {technologies.map((t) => (
          <TechChip key={t.name} tech={t} />
        ))}
      </ul>
    </div>
  );
}

function TechChip({ tech }: { tech: CourseTechnology }) {
  const slug = brandLogoSlug(tech.name);
  return (
    <li
      className={`course-hero-tech__chip${tech.tier === 'optional' ? ' is-optional' : ''}`}
      title={tech.name}
    >
      <span className="course-hero-tech__icon" aria-hidden="true">
        {slug ? <BrandLogo slug={slug} /> : <TechIcon icon={tech.icon} />}
      </span>
      <span>{tech.name}</span>
    </li>
  );
}
