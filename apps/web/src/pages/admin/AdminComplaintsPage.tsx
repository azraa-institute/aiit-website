import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { COMPLAINT_CATEGORY_LABEL } from '@/data/complaintCategories';
import type { AdminComplaintDetail, AdminComplaintSummary, ComplaintCategory, ComplaintStatus, Paginated } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatWhen, useAdminFetch } from './adminData';

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

function Detail({ id, onChanged, onClose }: { id: string; onChanged: () => void; onClose: () => void }) {
  const state = useAdminFetch<AdminComplaintDetail>(`/admin/complaints/${id}`);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await apiFetch(`/admin/complaints/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: reply, internal }) });
      setReply('');
      state.reload();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: ComplaintStatus) {
    setBusy(true);
    setError(undefined);
    try {
      await apiFetch(`/admin/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      state.reload();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="adm-drawer adm-drawer--wide" aria-label="Complaint details">
      <div className="adm-drawer__head">
        <h2>Complaint</h2>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
      {state.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' ? (
        <>
          <h3 className="adm-drawer__name">{state.data.subject}</h3>
          <p className="adm-muted">
            {COMPLAINT_CATEGORY_LABEL[state.data.category]} · {formatWhen(state.data.createdAt)}
          </p>
          <dl className="adm-dl">
            <div>
              <dt>From</dt>
              <dd>
                <Link to={`/admin/students?q=${encodeURIComponent(state.data.studentEmail ?? state.data.studentName ?? '')}`}>
                  {state.data.studentName ?? 'Student'}
                </Link>{' '}
                {state.data.studentEmail ? <span className="adm-muted">({state.data.studentEmail})</span> : null}
              </dd>
            </div>
            {state.data.courseTitle ? (
              <div>
                <dt>Course</dt>
                <dd>{state.data.courseTitle}</dd>
              </div>
            ) : null}
            {state.data.instructorName ? (
              <div>
                <dt>About instructor</dt>
                <dd>
                  <strong>{state.data.instructorName}</strong> <span className="adm-muted">(they cannot see this report)</span>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd>
                <span className={cn('adm-status', `adm-status--c-${state.data.status}`)}>{STATUS_LABEL[state.data.status]}</span>
              </dd>
            </div>
          </dl>

          <div className="adm-thread">
            <div className="adm-msg adm-msg--student">
              <p className="adm-msg__meta">{state.data.studentName ?? 'Student'} · original report</p>
              <p className="adm-prewrap">{state.data.body}</p>
            </div>
            {state.data.messages.map((m) => (
              <div key={m.id} className={cn('adm-msg', m.authorRole === 'admin' ? 'adm-msg--admin' : 'adm-msg--student', m.internal && 'adm-msg--internal')}>
                <p className="adm-msg__meta">
                  {m.authorRole === 'admin' ? (m.authorName ?? 'Admin') : (state.data.studentName ?? 'Student')} · {formatWhen(m.createdAt)}
                  {m.internal ? ' · internal note (student cannot see)' : ''}
                </p>
                <p className="adm-prewrap">{m.body}</p>
              </div>
            ))}
          </div>

          <form className="adm-reply" onSubmit={send}>
            <label className="adm-field">
              <span>{internal ? 'Internal note (only admins see this)' : 'Reply to the student'}</span>
              <textarea required rows={4} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} />
            </label>
            <label className="adm-check">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              <span>Internal note — do not send to the student</span>
            </label>
            {error ? <p className="adm-error" role="alert">{error}</p> : null}
            <div className="adm-actions">
              <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || !reply.trim()}>
                {internal ? 'Save note' : 'Send reply'}
              </button>
            </div>
          </form>

          <div className="adm-statusrow">
            <span className="adm-muted">Set status:</span>
            {(['open', 'in_review', 'resolved', 'dismissed'] as ComplaintStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={cn('adm-btn', s === state.data.status ? 'adm-btn--primary' : 'adm-btn--ghost')}
                disabled={busy || s === state.data.status}
                onClick={() => setStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="adm-muted">Resolving or dismissing notifies the student.</p>
        </>
      ) : null}
    </aside>
  );
}

export default function AdminComplaintsPage() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const status = params.get('status') ?? '';
  const category = params.get('category') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const query = new URLSearchParams({ page: String(page) });
  if (status) query.set('status', status);
  if (category) query.set('category', category);
  const list = useAdminFetch<Paginated<AdminComplaintSummary>>(`/admin/complaints?${query.toString()}`);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const totalPages = list.status === 'ready' ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Support</p>
          <h1 className="adm-title">Complaints</h1>
          <p className="adm-intro">
            Reports from students. Only admins can read these — including any report about an instructor.
          </p>
        </div>
      </div>

      <div className="adm-toolbar">
        <label className="adm-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            {(Object.keys(STATUS_LABEL) as ComplaintStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="">All</option>
            {(Object.keys(COMPLAINT_CATEGORY_LABEL) as ComplaintCategory[]).map((c) => (
              <option key={c} value={c}>
                {COMPLAINT_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {list.status === 'error' ? <p className="adm-error" role="alert">{list.message}</p> : null}
      {list.status === 'ready' && list.data.items.length === 0 ? <p className="adm-muted">No complaints match.</p> : null}

      {list.status === 'ready' && list.data.items.length > 0 ? (
        <>
          <div className="adm-tablewrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Category</th>
                  <th>About</th>
                  <th>Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((c) => (
                  <tr key={c.id} className={cn(selected === c.id && 'is-selected')}>
                    <td>
                      <button type="button" className="adm-linkbtn" onClick={() => setSelected(c.id)}>
                        {c.subject}
                      </button>
                    </td>
                    <td>{c.studentName ?? '—'}</td>
                    <td>{COMPLAINT_CATEGORY_LABEL[c.category]}</td>
                    <td>{c.instructorName ? `Instructor: ${c.instructorName}` : (c.courseTitle ?? '—')}</td>
                    <td>{formatWhen(c.updatedAt)}</td>
                    <td>
                      <span className={cn('adm-status', `adm-status--c-${c.status}`)}>{STATUS_LABEL[c.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {selected ? <Detail id={selected} onChanged={list.reload} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
