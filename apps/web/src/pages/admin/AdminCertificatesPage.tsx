import { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminCertificateRow, Paginated } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAdminFetch } from './adminData';
import { RevokeCertificateForm } from './RevokeCertificateForm';

const PAGE_SIZE = 25;

export default function AdminCertificatesPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (q) query.set('q', q);
  if (status) query.set('status', status);
  const list = useAdminFetch<Paginated<AdminCertificateRow>>(`/admin/certificates?${query.toString()}`);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  // Debounce the search box so we don't query on every keystroke -- same convention as AdminStudentsPage.tsx.
  useEffect(() => {
    if (search === q) return;
    const t = window.setTimeout(() => setParam('q', search.trim()), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = list.status === 'ready' ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  async function revoke(id: string, reason: string) {
    setActionBusy(true);
    setActionError(undefined);
    try {
      await apiFetch(`/admin/certificates/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) });
      setRevokingId(null);
      list.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not revoke that certificate.');
    } finally {
      setActionBusy(false);
    }
  }

  async function unrevoke(id: string) {
    setActionBusy(true);
    setActionError(undefined);
    try {
      await apiFetch(`/admin/certificates/${id}/unrevoke`, { method: 'POST' });
      list.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not un-revoke that certificate.');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Credentials</p>
          <h1 className="adm-title">Certificates</h1>
          <p className="adm-intro">
            Every certificate ever issued, across every student. Issuing a new one still happens from a student&apos;s own
            page — this is where you find one without knowing which student it belongs to.
          </p>
        </div>
      </div>

      <div className="adm-toolbar">
        <label className="adm-field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Holder name, credential ID, or course"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="adm-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </label>
      </div>

      {actionError ? <p className="adm-error" role="alert">{actionError}</p> : null}

      {list.status === 'loading' ? <p className="adm-muted">Loading certificates…</p> : null}
      {list.status === 'error' ? <p className="adm-error" role="alert">{list.message}</p> : null}

      {list.status === 'ready' ? (
        <>
          <p className="adm-muted">
            {list.data.total.toLocaleString()} certificate{list.data.total === 1 ? '' : 's'}
          </p>
          {list.data.items.length === 0 ? (
            <p className="adm-muted">No certificates match those filters.</p>
          ) : (
            <div className="adm-tablewrap">
              <table className="adm-table adm-table--rows">
                <thead>
                  <tr>
                    <th>Holder</th>
                    <th>Course</th>
                    <th>Credential ID</th>
                    <th>Issued</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((c) => (
                    <Fragment key={c.id}>
                      <tr>
                        <td>
                          {c.holderName}
                          <br />
                          <span className="adm-muted">{c.holderEmail ?? '—'}</span>
                        </td>
                        <td>{c.courseTitle}</td>
                        <td>
                          <code className="adm-code">{c.credentialId}</code>
                        </td>
                        <td>{new Date(c.issuedAt).toLocaleDateString()}</td>
                        <td>
                          {c.revokedAt ? (
                            <>
                              <span className={cn('adm-status', 'adm-status--suspended')}>revoked</span>
                              <br />
                              <button
                                type="button"
                                className="adm-linkbtn"
                                disabled={actionBusy}
                                onClick={() => unrevoke(c.id)}
                              >
                                Un-revoke
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={cn('adm-status', 'adm-status--active')}>active</span>
                              <br />
                              <button
                                type="button"
                                className="adm-linkbtn"
                                onClick={() => {
                                  setActionError(undefined);
                                  setRevokingId(c.id);
                                }}
                              >
                                Revoke
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {revokingId === c.id ? (
                        <tr>
                          <td colSpan={5}>
                            <RevokeCertificateForm
                              courseTitle={c.courseTitle}
                              busy={actionBusy}
                              error={actionError}
                              onCancel={() => setRevokingId(null)}
                              onSubmit={(reason) => revoke(c.id, reason)}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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
    </div>
  );
}
