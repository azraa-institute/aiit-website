import type { Assignment } from '@aiit/shared';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useLearner } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import { AssignmentRow } from './AssignmentRow';

const ORDER: Record<Assignment['status'], number> = { overdue: 0, upcoming: 1, submitted: 2, graded: 3 };

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
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} onSubmitted={state.refetch} />
          ))}
        </ul>
      )}
    </div>
  );
}
