import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Paginated, StudentDetail, StudentSummary, SuspendResult } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatWhen, useAdminCourses, useAdminFetch } from './adminData';
import { SuspendForm } from './SuspendForm';

const PAGE_SIZE = 25;

function StudentPanel({ id, onChanged, onClose }: { id: string; onChanged: () => void; onClose: () => void }) {
  const state = useAdminFetch<StudentDetail>(`/admin/students/${id}`);
  const [suspending, setSuspending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function act(path: string, body?: object) {
    setBusy(true);
    setError(undefined);
    try {
      await apiFetch<SuspendResult>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      setSuspending(false);
      state.reload();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="adm-drawer" aria-label="Student details">
      <div className="adm-drawer__head">
        <h2>Student</h2>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
      {state.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' ? (
        <>
          <h3 className="adm-drawer__name">{state.data.name ?? 'No name yet'}</h3>
          <p className="adm-muted">{state.data.email ?? 'No email on record'}</p>
          <span className={cn('adm-status', `adm-status--${state.data.status}`)}>{state.data.status.replace('_', ' ')}</span>

          <dl className="adm-dl">
            <div>
              <dt>Joined</dt>
              <dd>{formatWhen(state.data.joinedAt)}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{state.data.country ?? '—'}</dd>
            </div>
            <div>
              <dt>Time zone</dt>
              <dd>{state.data.timeZone ?? 'Not set'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{state.data.phone ?? '—'}</dd>
            </div>
            <div>
              <dt>Live classes attended</dt>
              <dd>{state.data.attendance.attended}</dd>
            </div>
          </dl>

          <h4 className="adm-drawer__sub">Courses</h4>
          {state.data.enrollments.length === 0 ? (
            <p className="adm-muted">Not enrolled in any course.</p>
          ) : (
            <ul className="adm-plain">
              {state.data.enrollments.map((e) => (
                <li key={e.courseId}>
                  {e.courseTitle} <span className="adm-muted">· {e.status}</span>
                </li>
              ))}
            </ul>
          )}

          {state.data.status === 'suspended' ? (
            <p className="adm-notice">
              Suspended{state.data.suspendedAt ? ` on ${formatWhen(state.data.suspendedAt)}` : ''}
              {state.data.suspendedReason ? `: ${state.data.suspendedReason}` : ''}
            </p>
          ) : null}

          {error && !suspending ? <p className="adm-error" role="alert">{error}</p> : null}

          {suspending ? (
            <SuspendForm
              name={state.data.name ?? 'this student'}
              busy={busy}
              error={error}
              onCancel={() => setSuspending(false)}
              onSubmit={(reason) => act(`/admin/users/${id}/suspend`, { reason })}
            />
          ) : state.data.status === 'active' ? (
            <button type="button" className="adm-btn adm-btn--danger" onClick={() => { setError(undefined); setSuspending(true); }}>
              Suspend account
            </button>
          ) : state.data.status === 'suspended' ? (
            <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={() => act(`/admin/users/${id}/reactivate`)}>
              {busy ? 'Working…' : 'Reactivate account'}
            </button>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}

export default function AdminStudentsPage() {
  const [params, setParams] = useSearchParams();
  const courses = useAdminCourses();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [selected, setSelected] = useState<string | null>(null);

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const courseId = params.get('courseId') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (q) query.set('q', q);
  if (status) query.set('status', status);
  if (courseId) query.set('courseId', courseId);
  const list = useAdminFetch<Paginated<StudentSummary>>(`/admin/students?${query.toString()}`);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    if (search === q) return;
    const t = window.setTimeout(() => setParam('q', search.trim()), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = list.status === 'ready' ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const courseList = courses.status === 'ready' ? courses.data : [];

  return (
    <div className={cn('adm-page', selected && 'has-drawer')}>
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">People</p>
          <h1 className="adm-title">Students</h1>
          <p className="adm-intro">Everyone who has signed up. Open a student to see their courses or suspend the account.</p>
        </div>
      </div>

      <div className="adm-toolbar">
        <label className="adm-field">
          <span>Search</span>
          <input type="search" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="adm-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_deletion">Pending deletion</option>
          </select>
        </label>
        <label className="adm-field">
          <span>Course</span>
          <select value={courseId} onChange={(e) => setParam('courseId', e.target.value)}>
            <option value="">All courses</option>
            {courseList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.status === 'loading' ? <p className="adm-muted">Loading students…</p> : null}
      {list.status === 'error' ? <p className="adm-error" role="alert">{list.message}</p> : null}

      {list.status === 'ready' ? (
        <>
          <p className="adm-muted">
            {list.data.total.toLocaleString()} student{list.data.total === 1 ? '' : 's'}
          </p>
          {list.data.items.length === 0 ? (
            <p className="adm-muted">No students match those filters.</p>
          ) : (
            <div className="adm-tablewrap">
              <table className="adm-table adm-table--rows">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Country</th>
                    <th className="num">Courses</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((s) => (
                    <tr key={s.id} className={cn(selected === s.id && 'is-selected')}>
                      <td>
                        <button type="button" className="adm-linkbtn" onClick={() => setSelected(s.id)}>
                          {s.name ?? 'No name yet'}
                        </button>
                      </td>
                      <td>{s.email ?? '—'}</td>
                      <td>{s.country ?? '—'}</td>
                      <td className="num">{s.enrolledCourses}</td>
                      <td>{new Date(s.joinedAt).toLocaleDateString()}</td>
                      <td>
                        <span className={cn('adm-status', `adm-status--${s.status}`)}>{s.status.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="adm-pager" aria-label="Pages">
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                Previous
              </button>
              <span className="adm-muted">
                Page {page} of {totalPages}
              </span>
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>
                Next
              </button>
            </nav>
          ) : null}
        </>
      ) : null}

      {selected ? <StudentPanel id={selected} onChanged={list.reload} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
