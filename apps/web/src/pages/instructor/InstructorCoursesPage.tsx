import { Link } from 'react-router-dom';
import type { InstructorCourse } from '@aiit/shared';
import { useApiFetch } from '@/lib/useApiFetch';

export default function InstructorCoursesPage() {
  const state = useApiFetch<InstructorCourse[]>('/instructor/courses');

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Teaching</p>
          <h1 className="adm-title">My courses</h1>
          <p className="adm-intro">The courses the AIIT team has assigned to you. Open one to see its students, set assignments and post announcements.</p>
        </div>
      </div>

      {state.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' && state.data.length === 0 ? (
        <p className="adm-muted">You are not assigned to any course yet.</p>
      ) : null}

      {state.status === 'ready' && state.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {state.data.map((c) => (
            <li className="adm-card" key={c.id}>
              <div className="adm-card__main">
                <h3>
                  <Link to={`/instructor/courses/${c.id}`}>{c.title}</Link>
                </h3>
                <p className="adm-card__meta">
                  {c.enrolled} student{c.enrolled === 1 ? '' : 's'} · {c.assignments} assignment{c.assignments === 1 ? '' : 's'} ·{' '}
                  {c.upcomingClasses} upcoming class{c.upcomingClasses === 1 ? '' : 'es'}
                </p>
                {c.needsGrading > 0 ? <p className="adm-card__meta adm-flag">{c.needsGrading} waiting to be graded</p> : null}
              </div>
              <div className="adm-card__actions">
                <Link to={`/instructor/courses/${c.id}`} className="adm-btn adm-btn--primary">
                  Open course
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
