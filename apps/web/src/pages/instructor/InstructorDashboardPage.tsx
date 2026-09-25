import { Link } from 'react-router-dom';
import type { InstructorDashboard } from '@aiit/shared';
import { useApiFetch } from '@/lib/useApiFetch';
import { formatWhen } from '@/pages/admin/adminData';
import { formatClassRange, useDisplayZone, useLiveClasses } from '@/pages/portal/liveClassData';

function Kpi({ label, value, hint, to }: { label: string; value: number; hint?: string; to?: string }) {
  const body = (
    <>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value.toLocaleString()}</span>
      {hint ? <span className="kpi__hint">{hint}</span> : null}
    </>
  );
  return to ? (
    <Link to={to} className="kpi kpi--link">
      {body}
    </Link>
  ) : (
    <div className="kpi">{body}</div>
  );
}

export default function InstructorDashboardPage() {
  const state = useApiFetch<InstructorDashboard>('/instructor/dashboard');
  const classes = useLiveClasses(30_000);
  const { zone } = useDisplayZone();

  if (state.status === 'loading') return <p className="adm-muted">Loading your dashboard…</p>;
  if (state.status === 'error') return <p className="adm-error" role="alert">{state.message}</p>;
  const d = state.data;

  const next =
    classes.status === 'ready'
      ? classes.classes.filter((c) => c.joinState !== 'ended' && c.joinState !== 'cancelled').slice(0, 4)
      : [];

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Overview</p>
          <h1 className="adm-title">Dashboard</h1>
          <p className="adm-intro">Your classes, your students and the work waiting for you.</p>
        </div>
      </div>

      {d.courses === 0 ? (
        <p className="adm-notice">
          The AIIT team has not assigned you to a course yet. Once they do, its students, assignments and classes appear here.
        </p>
      ) : null}

      <div className="kpis">
        <Kpi label="My courses" value={d.courses} to="/instructor/courses" />
        <Kpi label="Students" value={d.students} hint="across your courses" />
        <Kpi label="Needs grading" value={d.needsGrading} to="/instructor/grading" hint="handed in, not yet graded" />
        <Kpi label="Classes this week" value={d.classesThisWeek} to="/instructor/classes" />
      </div>

      <section className="adm-panel" aria-labelledby="next-classes">
        <div className="adm-panel__head">
          <h2 id="next-classes">Next classes</h2>
          <Link to="/instructor/classes" className="adm-linkbtn">
            All classes
          </Link>
        </div>
        {next.length === 0 ? (
          <p className="adm-muted">No upcoming classes assigned to you.</p>
        ) : (
          <ul className="adm-plain">
            {next.map((c) => (
              <li key={c.id} className="adm-row">
                <span>
                  <strong>{c.courseTitle}</strong>
                  <span className="adm-muted"> · {formatWhen(c.startsAt)} ({formatClassRange(c.startsAt, c.endsAt, zone)})</span>
                </span>
                {c.joinState === 'open' ? (
                  <Link to={`/classroom/${c.id}`} className="adm-btn adm-btn--primary">
                    {c.status === 'live' ? 'Rejoin class' : 'Start class'}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="adm-panel adm-panel--gap" aria-labelledby="grading-queue">
        <div className="adm-panel__head">
          <h2 id="grading-queue">Waiting to be graded</h2>
          {d.needsGrading > 0 ? (
            <Link to="/instructor/grading" className="adm-linkbtn">
              See all {d.needsGrading}
            </Link>
          ) : null}
        </div>
        {d.gradingQueue.length === 0 ? (
          <p className="adm-muted">Nothing to grade right now.</p>
        ) : (
          <ul className="adm-plain">
            {d.gradingQueue.map((g) => (
              <li key={g.submissionId} className="adm-row">
                <span>
                  <strong>{g.studentName ?? 'A student'}</strong> — {g.assignmentTitle}
                  <span className="adm-muted"> · {g.courseTitle} · handed in {formatWhen(g.submittedAt)}</span>
                </span>
                <Link to={`/instructor/assignments/${g.assignmentId}`} className="adm-btn adm-btn--ghost">
                  Grade
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
