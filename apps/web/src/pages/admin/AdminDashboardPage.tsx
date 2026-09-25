import { Link } from 'react-router-dom';
import type { AdminDashboard } from '@aiit/shared';
import { useAdminFetch } from './adminData';

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

export default function AdminDashboardPage() {
  const state = useAdminFetch<AdminDashboard>('/admin/dashboard');

  if (state.status === 'loading') return <p className="adm-muted">Loading the dashboard…</p>;
  if (state.status === 'error') return <p className="adm-error" role="alert">{state.message}</p>;

  const d = state.data;
  const courses = [...d.courses].sort((a, b) => b.enrolled - a.enrolled || a.title.localeCompare(b.title));
  const max = Math.max(1, ...courses.map((c) => c.enrolled));
  const totalEnrollments = courses.reduce((sum, c) => sum + c.enrolled, 0);

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Overview</p>
          <h1 className="adm-title">Dashboard</h1>
          <p className="adm-intro">Where the programme stands right now.</p>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Total students" value={d.students.total} to="/admin/students" />
        <Kpi label="Active" value={d.students.active} to="/admin/students?status=active" />
        <Kpi label="Suspended" value={d.students.suspended} to="/admin/students?status=suspended" />
        <Kpi label="New this week" value={d.students.newThisWeek} hint="signed up in the last 7 days" />
        <Kpi label="Instructors" value={d.instructors.active} hint={`${d.instructors.total} in total`} to="/admin/instructors" />
        <Kpi label="Live now" value={d.classes.liveNow} hint={`${d.classes.upcomingWeek} classes this week`} to="/admin/classes" />
      </div>

      <section className="adm-panel" aria-labelledby="per-course">
        <div className="adm-panel__head">
          <h2 id="per-course">Students per course</h2>
          <p className="adm-muted">
            {totalEnrollments.toLocaleString()} enrolments across {courses.length} courses
          </p>
        </div>

        {courses.length === 0 ? (
          <p className="adm-muted">No published courses yet.</p>
        ) : (
          <ul className="bars" role="list">
            {courses.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/admin/students?courseId=${c.id}`}
                  className="bars__row"
                  title={`${c.title}: ${c.enrolled} student${c.enrolled === 1 ? '' : 's'}`}
                >
                  <span className="bars__label">{c.title}</span>
                  <span className="bars__track" aria-hidden="true">
                    <span className="bars__fill" style={{ width: `${(c.enrolled / max) * 100}%` }} />
                  </span>
                  <span className="bars__value">{c.enrolled.toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {courses.length > 0 ? (
          <details className="adm-details">
            <summary>View as table</summary>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th className="num">Students</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td className="num">{c.enrolled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ) : null}
      </section>
    </div>
  );
}
