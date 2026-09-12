import { Link } from 'react-router-dom';
import type { Enrollment } from '@aiit/shared';
import { Button } from '@/components/primitives/Button';

/**
 * One enrolled course. No progress percentage -- there's no lesson-level
 * completion signal yet (course curricula are empty), so a fabricated 0-100
 * meter would be inventing data. Status (active/completed) is the real,
 * honest signal instead.
 */
export function CoursePathRow({ enrolled }: { enrolled: Enrollment }) {
  const done = enrolled.status === 'completed';
  const { course } = enrolled;

  return (
    <article className="cpath" data-done={done ? '' : undefined}>
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
    </article>
  );
}
