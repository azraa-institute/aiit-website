import { Link } from 'react-router-dom';
import type { GradingItem } from '@aiit/shared';
import { useApiFetch } from '@/lib/useApiFetch';
import { formatWhen } from '@/pages/admin/adminData';

export default function InstructorGradingPage() {
  const state = useApiFetch<GradingItem[]>('/instructor/grading');

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Teaching</p>
          <h1 className="adm-title">Grading</h1>
          <p className="adm-intro">Work students have handed in and that is still waiting for a grade, oldest first.</p>
        </div>
      </div>

      {state.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' && state.data.length === 0 ? <p className="adm-muted">Nothing is waiting to be graded. </p> : null}
      {state.status === 'ready' && state.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {state.data.map((g) => (
            <li className="adm-card" key={g.submissionId}>
              <div className="adm-card__main">
                <h3>{g.studentName ?? 'A student'}</h3>
                <p className="adm-card__meta">
                  {g.assignmentTitle} · {g.courseTitle}
                </p>
                <p className="adm-card__meta">Handed in {formatWhen(g.submittedAt)}</p>
              </div>
              <div className="adm-card__actions">
                <Link to={`/instructor/assignments/${g.assignmentId}`} className="adm-btn adm-btn--primary">
                  Review and grade
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
