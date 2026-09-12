import { Link } from 'react-router-dom';
import type { Enrollment } from '@aiit/shared';
import { Plate } from '@/components/primitives/Plate';
import { Button } from '@/components/primitives/Button';

/**
 * One enrolled course. No progress percentage -- there's no lesson-level
 * completion signal yet (course curricula are empty), so a fabricated 0-100
 * meter would be inventing data. Status (active/completed) is the real,
 * honest signal instead. The thumbnail reuses the same Plate primitive as
 * the public course cards (real image, or deterministic line-art keyed to
 * the course's domain) rather than a plain text row.
 */
export function CoursePathRow({ enrolled }: { enrolled: Enrollment }) {
  const done = enrolled.status === 'completed';
  const { course } = enrolled;

  return (
    <article className="cpath" data-done={done ? '' : undefined}>
      <Link to={`/courses/${course.slug}`} className="cpath__plate" aria-hidden="true" tabIndex={-1}>
        <Plate source={course.image} seed={course.slug} motif={course.domain?.motif} ratio={1} />
      </Link>

      <div className="cpath__body">
        <div className="cpath__head">
          <p className="cpath__eyebrow">{done ? 'Completed' : 'In progress'}</p>
          <h3 className="cpath__title">
            <Link to={`/courses/${course.slug}`}>{course.title}</Link>
          </h3>
          {course.domain ? <p className="cpath__point">{course.domain.name}</p> : null}
        </div>

        <div className="cpath__action">
          <Button as="link" to={`/courses/${course.slug}`} variant="secondary" size="sm" arrow>
            {done ? 'Review course' : 'Continue course'}
          </Button>
        </div>
      </div>
    </article>
  );
}
