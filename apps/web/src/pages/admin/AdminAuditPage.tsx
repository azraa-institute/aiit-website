import { useState } from 'react';
import type { AuditLogEntry, Paginated } from '@aiit/shared';
import { formatWhen, useAdminFetch } from './adminData';

const ACTION_LABEL: Record<string, string> = {
  'instructor.create': 'Created an instructor account',
  'instructor.reset_password': 'Reset an instructor password',
  'user.suspend': 'Suspended an account',
  'user.reactivate': 'Reactivated an account',
};

function describe(entry: AuditLogEntry): string {
  const parts: string[] = [];
  const m = entry.metadata;
  if (typeof m.email === 'string') parts.push(m.email);
  if (typeof m.role === 'string') parts.push(String(m.role));
  if (typeof m.reason === 'string') parts.push(`“${m.reason}”`);
  return parts.join(' · ');
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const state = useAdminFetch<Paginated<AuditLogEntry>>(`/admin/audit-log?page=${page}`);
  const totalPages = state.status === 'ready' ? Math.max(1, Math.ceil(state.data.total / state.data.pageSize)) : 1;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Accountability</p>
          <h1 className="adm-title">Audit log</h1>
          <p className="adm-intro">A permanent record of who changed which account, and when. Entries cannot be edited or removed.</p>
        </div>
      </div>

      {state.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' && state.data.items.length === 0 ? <p className="adm-muted">Nothing has been recorded yet.</p> : null}

      {state.status === 'ready' && state.data.items.length > 0 ? (
        <>
          <div className="adm-tablewrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>What</th>
                  <th>Details</th>
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
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Newer
              </button>
              <span className="adm-muted">
                Page {page} of {totalPages}
              </span>
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Older
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
