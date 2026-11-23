import { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminCertificateRow, BulkIssueCertificatesResult, CertificateEligibleStudent, Paginated } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { CopyButton } from '@/components/common/CopyButton';
import { useAdminCourses, useAdminFetch } from './adminData';
import { RevokeCertificateForm } from './RevokeCertificateForm';

const PAGE_SIZE = 25;

/** Pick a course, select from its actively-enrolled, not-yet-certified learners, and issue to all of them in one request -- instead of the per-student drawer's one-at-a-time flow (AdminStudentsPage.tsx). */
function BulkIssuePanel({ onIssued }: { onIssued: () => void }) {
  const courses = useAdminCourses();
  const [courseSlug, setCourseSlug] = useState('');
  const [students, setStudents] = useState<CertificateEligibleStudent[] | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [issuing, setIssuing] = useState(false);
  const [result, setResult] = useState<BulkIssueCertificatesResult>();
  const [error, setError] = useState<string>();

  async function loadStudents(slug: string) {
    setCourseSlug(slug);
    setStudents(null);
    setSelected(new Set());
    setResult(undefined);
    setError(undefined);
    if (!slug) return;
    setLoadingStudents(true);
    setLoadError(undefined);
    try {
      const rows = await apiFetch<CertificateEligibleStudent[]>(`/courses/${slug}/certificates/eligible`);
      setStudents(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load this course’s students.');
    } finally {
      setLoadingStudents(false);
    }
  }

  const eligible = (students ?? []).filter((s) => !s.hasCertificate);

  function toggle(userId: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((cur) => (cur.size === eligible.length ? new Set() : new Set(eligible.map((s) => s.userId))));
  }

  async function issueSelected() {
    setIssuing(true);
    setError(undefined);
    setResult(undefined);
    try {
      const res = await apiFetch<BulkIssueCertificatesResult>(`/courses/${courseSlug}/certificates/bulk`, {
        method: 'POST',
        body: JSON.stringify({ userIds: [...selected] }),
      });
      setResult(res);
      setSelected(new Set());
      await loadStudents(courseSlug);
      onIssued();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue those certificates.');
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="adm-card">
      <div className="adm-card__main">
        <h2 className="adm-h2">Bulk issue</h2>
        <p className="adm-muted">
          Pick a course, select learners from its roster, and issue certificates to all of them at once.
        </p>

        <label className="adm-field">
          <span>Course</span>
          {courses.status === 'ready' ? (
            <select value={courseSlug} onChange={(e) => loadStudents(e.target.value)}>
              <option value="">Select a course…</option>
              {courses.data.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="adm-muted">Loading courses…</p>
          )}
        </label>

        {loadingStudents ? <p className="adm-muted">Loading students…</p> : null}
        {loadError ? <p className="adm-error" role="alert">{loadError}</p> : null}

        {students && !loadingStudents ? (
          students.length === 0 ? (
            <p className="adm-muted">No one is actively enrolled in this course yet.</p>
          ) : eligible.length === 0 ? (
            <p className="adm-muted">Everyone enrolled in this course already has a certificate.</p>
          ) : (
            <>
              <fieldset className="adm-checks">
                <legend className="visually-hidden">Learners eligible for a certificate</legend>
                <label className="adm-check">
                  <input type="checkbox" checked={selected.size === eligible.length} onChange={toggleAll} />
                  <span>Select all ({eligible.length})</span>
                </label>
                {eligible.map((s) => (
                  <label key={s.userId} className="adm-check">
                    <input type="checkbox" checked={selected.has(s.userId)} onChange={() => toggle(s.userId)} />
                    <span>{s.name ?? s.email ?? s.userId.slice(0, 8)}</span>
                  </label>
                ))}
              </fieldset>

              {error ? <p className="adm-error" role="alert">{error}</p> : null}
              {result ? (
                <p className="adm-muted">
                  Issued {result.issued.length} certificate{result.issued.length === 1 ? '' : 's'}
                  {result.skipped.length > 0 ? `; ${result.skipped.length} skipped (${result.skipped.map((s) => s.reason).join('; ')})` : ''}.
                </p>
              ) : null}

              <div className="adm-card__actions">
                <button
                  type="button"
                  className="adm-btn adm-btn--primary"
                  disabled={selected.size === 0 || issuing}
                  onClick={issueSelected}
                >
                  {issuing ? 'Issuing…' : `Issue to ${selected.size} selected`}
                </button>
              </div>
            </>
          )
        ) : null}
      </div>
    </div>
  );
}

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
            Every certificate ever issued, across every student. Issue one to a single learner from their own page, or
            to many at once below; the table further down is where you find an existing one without knowing which
            student it belongs to.
          </p>
        </div>
      </div>

      <BulkIssuePanel onIssued={list.reload} />

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
                          <span className="adm-copyrow">
                            <code className="adm-code">{c.credentialId}</code>
                            <CopyButton value={c.credentialId} title="Copy credential ID" />
                          </span>
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
