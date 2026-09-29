import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AuditLogEntry, Paginated } from '@aiit/shared';
import { formatWhen, useAdminFetch } from './adminData';

const ACTION_LABEL: Record<string, string> = {
  'instructor.create': 'Created an instructor account',
  'instructor.reset_password': 'Reset an instructor password',
  'user.suspend': 'Suspended an account',
  'user.reactivate': 'Reactivated an account',
  'course.set_instructors': 'Changed a course’s instructors',
  'timetable.create': 'Created a timetable',
  'timetable.update': 'Edited a timetable',
  'timetable.delete': 'Deleted a timetable',
  'timetable.generate': 'Generated classes from a timetable',
  'live_class.create': 'Added a one-off class',
  'live_class.update': 'Edited a class',
  'live_class.cancel': 'Cancelled a class',
  'complaint.reply': 'Replied to a complaint',
  'complaint.note': 'Added an internal note',
  'complaint.status': 'Changed a complaint’s status',
  'announcement.create': 'Sent an announcement',
};

function describe(entry: AuditLogEntry): string {
  const parts: string[] = [];
  const m = entry.metadata;
  if (typeof m.email === 'string') parts.push(m.email);
  if (typeof m.role === 'string') parts.push(String(m.role));
  if (typeof m.course === 'string') parts.push(String(m.course));
  if (typeof m.reason === 'string') parts.push(`“${m.reason}”`);
  if (typeof m.from === 'string' && typeof m.to === 'string') parts.push(`${m.from} → ${m.to}`);
  if (typeof m.audience === 'string') parts.push(String(m.audience));
  if (typeof m.recipients === 'number') parts.push(`${m.recipients} recipient${m.recipients === 1 ? '' : 's'}`);
  if (typeof m.created === 'number') parts.push(`${m.created} class${m.created === 1 ? '' : 'es'} created`);
  if (entry.targetId) parts.push(`ref ${entry.targetId.slice(0, 8)}`);
  return parts.join(' · ');
}

export default function AdminAuditPage() {
  const [params, setParams] = useSearchParams();
  const actions = useAdminFetch<string[]>('/admin/audit-actions');
  const [search, setSearch] = useState(params.get('q') ?? '');

  const q = params.get('q') ?? '';
  const action = params.get('action') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set('q', q);
  if (action) query.set('action', action);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const state = useAdminFetch<Paginated<AuditLogEntry>>(`/admin/audit-log?${query.toString()}`);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  // Debounce the free-text search so we don't query on every keystroke.
  useEffect(() => {
    if (search === q) return;
    const t = window.setTimeout(() => setParam('q', search.trim()), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = state.status === 'ready' ? Math.max(1, Math.ceil(state.data.total / state.data.pageSize)) : 1;
  const actionList = actions.status === 'ready' ? actions.data : [];
  const hasFilters = Boolean(q || action || from || to);

  function clearFilters() {
    setSearch('');
    setParams({}, { replace: true });
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Accountability</p>
          <h1 className="adm-title">Audit log</h1>
          <p className="adm-intro">
            A permanent record of who changed which account, and when. Entries cannot be edited or removed. Search
            works even if you only half-remember what happened — it looks across the person&apos;s name and email,
            the reason given, and any other detail on the entry.
          </p>
        </div>
      </div>

      <div className="adm-toolbar">
        <label className="adm-field adm-field--wide">
          <span>Search</span>
          <input
            type="search"
            placeholder="A name, email, course, or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="adm-field">
          <span>Action</span>
          <select value={action} onChange={(e) => setParam('action', e.target.value)}>
            <option value="">All actions</option>
            {actionList.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a] ?? a}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field">
          <span>From</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setParam('from', e.target.value)} />
        </label>
        <label className="adm-field">
          <span>To</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setParam('to', e.target.value)} />
        </label>
        {hasFilters ? (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      {state.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' && state.data.items.length === 0 ? (
        <p className="adm-muted">{hasFilters ? 'Nothing matches those filters.' : 'Nothing has been recorded yet.'}</p>
      ) : null}

      {state.status === 'ready' && state.data.items.length > 0 ? (
        <>
          <p className="adm-muted">{state.data.total.toLocaleString()} entr{state.data.total === 1 ? 'y' : 'ies'}</p>
          <div className="adm-tablewrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Performed By</th>
                  <th>Action</th>
                  <th>Activity Details</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((e) => (
                  <tr key={e.id}>
                    <td>{formatWhen(e.createdAt)}</td>
                    <td>{e.actorName ?? e.actorId.slice(0, 8)}</td>
                    <td>{ACTION_LABEL[e.action] ?? e.action}</td>
                    <td>{describe(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <nav className="adm-pager" aria-label="Pages">
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                Newer
              </button>
              <span className="adm-muted">
                Page {page} of {totalPages}
              </span>
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>
                Older
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
