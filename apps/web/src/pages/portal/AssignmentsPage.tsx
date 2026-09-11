import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { useLearner, courseById } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';

const STATUS_LABEL = {
  pending: 'To do',
  submitted: 'Submitted',
  graded: 'Graded',
} as const;

const ORDER = { pending: 0, submitted: 1, graded: 2 } as const;

export default function AssignmentsPage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your assignments" />;
  if (state.status === 'error') return null;

  const assignments = [...state.learner.assignments].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Assignments</p>
        <h1 className="portal-page__title">Your work</h1>
        <p className="portal-page__intro">
          Practical work set by your courses — what&apos;s due, what you&apos;ve submitted and your feedback.
        </p>
      </header>

      {assignments.length === 0 ? (
        <PortalEmpty
          title="No assignments yet"
          body="When a course you're enrolled in sets practical work, it appears here with its due date and your submission status."
          action={{ label: 'Browse courses', to: '/courses' }}
        />
      ) : (
        <ul className="tasklist" role="list">
          {assignments.map((a) => {
            const course = courseById(a.courseId);
            return (
              <li key={a.id} className="task" data-status={a.status} data-reveal>
                <div className="task__main">
                  <p className="task__status">{STATUS_LABEL[a.status]}</p>
                  <h2 className="task__title">{a.title}</h2>
                  {course ? <p className="task__course">{course.title}</p> : null}
                </div>
                <p className="task__meta">
                  {a.status === 'graded' && a.grade
                    ? `Grade: ${a.grade}`
                    : a.dueAt
                      ? `Due ${formatDate(a.dueAt)}`
                      : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
