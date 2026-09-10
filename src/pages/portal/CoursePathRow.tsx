import { Link } from 'react-router-dom';
import { Button } from '@/components/primitives/Button';
import { courseById } from './learnerData';
import type { EnrolledCourse } from './learnerData';

/**
 * One enrolled course drawn as a short journey rather than a card: a progress
 * meter, the learner's current point, real curriculum stages where the record
 * provides them, and one clear next action. Each element is omitted when the
 * learner record has nothing to fill it.
 */
export function CoursePathRow({ enrolled }: { enrolled: EnrolledCourse }) {
  const course = courseById(enrolled.courseId);
  if (!course) return null;

  const done = enrolled.progress >= 100;
  const pct = Math.max(0, Math.min(100, Math.round(enrolled.progress)));

  return (
    <article className="cpath" data-done={done ? '' : undefined}>
      <div className="cpath__head">
        <p className="cpath__eyebrow">{done ? 'Completed' : 'In progress'}</p>
        <h3 className="cpath__title">
          <Link to={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>
        {enrolled.currentPoint ? (
          <p className="cpath__point">
            {done ? 'Finished at' : 'You are at'}: <span>{enrolled.currentPoint}</span>
          </p>
        ) : null}
      </div>

      <div className="cpath__meter" role="img" aria-label={`${pct}% complete`}>
        <span className="cpath__meter-track">
          <span className="cpath__meter-fill" style={{ '--v': `${pct}%` } as React.CSSProperties} />
        </span>
        <span className="cpath__meter-value">{pct}%</span>
      </div>

      {enrolled.stages && enrolled.stages.length > 0 ? (
        <ol className="cpath__stages" aria-label="Course stages">
          {enrolled.stages.map((s) => (
            <li key={s.label} className="cpath__stage" data-state={s.state}>
              <span className="cpath__stage-mark" aria-hidden="true" />
              <span className="cpath__stage-label">{s.label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="cpath__action">
        {enrolled.nextAction ? (
          <Button as="link" to={enrolled.nextAction.href} variant="secondary" size="sm" arrow>
            {enrolled.nextAction.label}
          </Button>
        ) : (
          <Button as="link" to={`/courses/${course.slug}`} variant="secondary" size="sm" arrow>
            {done ? 'Review course' : 'Continue course'}
          </Button>
        )}
        {enrolled.nextAction?.context ? (
          <span className="cpath__action-context">{enrolled.nextAction.context}</span>
        ) : null}
      </div>
    </article>
  );
}
