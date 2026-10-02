import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  AdminAffiliateDetail,
  AdminAffiliateStats,
  AdminAffiliateSummary,
  AffiliateApplicationStatus,
  AffiliateType,
  Paginated,
} from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatWhen, useAdminFetch } from './adminData';

const TYPE_TAG_CLASS: Record<AffiliateType, string> = {
  creator: 'adm-tag--creator',
  student: 'adm-tag--student',
  affiliate_to_affiliate: 'adm-tag--peer',
};

const STATUS_LABEL: Record<AffiliateApplicationStatus, string> = {
  pending: 'Pending',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const TYPE_LABEL: Record<AffiliateType, string> = {
  creator: 'Creator',
  student: 'Student',
  affiliate_to_affiliate: 'Affiliate-to-affiliate',
};

function TypeTag({ type }: { type: AffiliateType }) {
  return <span className={cn('adm-tag', TYPE_TAG_CLASS[type])}>{TYPE_LABEL[type]}</span>;
}

function Kpi({ label, value, active, onClick }: { label: string; value: number; active?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value.toLocaleString()}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={cn('kpi', 'kpi--link', active && 'is-active')} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="kpi">{body}</div>
  );
}

function Detail({ id, onChanged, onClose }: { id: string; onChanged: () => void; onClose: () => void }) {
  const state = useAdminFetch<AdminAffiliateDetail>(`/admin/affiliates/${id}`);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function setStatus(status: AffiliateApplicationStatus) {
    setBusy(true);
    setError(undefined);
    try {
      await apiFetch(`/admin/affiliates/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(status === 'rejected' ? { rejectionReason: reason } : {}) }),
      });
      state.reload();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="adm-drawer" aria-label="Affiliate application details">
      <div className="adm-drawer__head">
        <h2>Affiliate application</h2>
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

          <dl className="adm-dl">
            <div>
              <dt>Type</dt>
              <dd>
                <TypeTag type={state.data.type} />
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={cn('adm-status', `adm-status--a-${state.data.applicationStatus}`)}>
                  {STATUS_LABEL[state.data.applicationStatus]}
                </span>
              </dd>
            </div>
            <div>
              <dt>Applied</dt>
              <dd>{formatWhen(state.data.createdAt)}</dd>
            </div>
            <div>
              <dt>Registered via their link</dt>
              <dd>{state.data.registrationCount}</dd>
            </div>
            <div>
              <dt>Signature</dt>
              <dd>{state.data.signedName ? `${state.data.signedName}${state.data.signedAt ? ` — ${formatWhen(state.data.signedAt)}` : ''}` : 'Not on file (applied before e-signature)'}</dd>
            </div>
            {state.data.phone ? (
              <div>
                <dt>Phone</dt>
                <dd>{state.data.phone}</dd>
              </div>
            ) : null}
            {state.data.handle ? (
              <div>
                <dt>Social handle</dt>
                <dd>{state.data.handle}</dd>
              </div>
            ) : null}
            {state.data.country || state.data.city ? (
              <div>
                <dt>Location</dt>
                <dd>{[state.data.city, state.data.country].filter(Boolean).join(', ')}</dd>
              </div>
            ) : null}
            {state.data.source ? (
              <div>
                <dt>Heard about us via</dt>
                <dd>{state.data.source}</dd>
              </div>
            ) : null}
            {state.data.reviewedAt ? (
              <div>
                <dt>Reviewed</dt>
                <dd>
                  {formatWhen(state.data.reviewedAt)} {state.data.reviewedByName ? `by ${state.data.reviewedByName}` : ''}
                </dd>
              </div>
            ) : null}
            {state.data.applicationStatus === 'rejected' && state.data.rejectionReason ? (
              <div>
                <dt>Reason given</dt>
                <dd>{state.data.rejectionReason}</dd>
              </div>
            ) : null}
          </dl>

          {error ? <p className="adm-error" role="alert">{error}</p> : null}

          <label className="adm-field">
            <span>Rejection reason (required to reject)</span>
            <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>

          <div className="adm-statusrow">
            <span className="adm-muted">Set status:</span>
            {(['pending', 'in_review', 'approved', 'rejected'] as AffiliateApplicationStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={cn('adm-btn', s === state.data.applicationStatus ? 'adm-btn--primary' : 'adm-btn--ghost')}
                disabled={busy || s === state.data.applicationStatus || (s === 'rejected' && !reason.trim())}
                onClick={() => setStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="adm-muted">Approving or rejecting emails the applicant and notifies them in-app.</p>
        </>
      ) : null}
    </aside>
  );
}

export default function AdminAffiliatesPage() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const status = params.get('status') ?? '';
  const type = params.get('type') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const stats = useAdminFetch<AdminAffiliateStats>('/admin/affiliates/stats');

  const query = new URLSearchParams({ page: String(page) });
  if (status) query.set('status', status);
  if (type) query.set('type', type);
  const list = useAdminFetch<Paginated<AdminAffiliateSummary>>(`/admin/affiliates?${query.toString()}`);

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
          <p className="adm-eyebrow">Affiliate program</p>
          <h1 className="adm-title">Affiliates</h1>
          <p className="adm-intro">
            Every self-service application, screened here before it unlocks a referral link. Approving or rejecting
            emails the applicant.
          </p>
        </div>
      </div>

      {stats.status === 'ready' ? (
        <div className="kpis">
          <Kpi label="Total applications" value={stats.data.total} active={status === ''} onClick={() => setParam('status', '')} />
          <Kpi label="Pending" value={stats.data.pending} active={status === 'pending'} onClick={() => setParam('status', 'pending')} />
          <Kpi label="In review" value={stats.data.inReview} active={status === 'in_review'} onClick={() => setParam('status', 'in_review')} />
          <Kpi label="Approved" value={stats.data.approved} active={status === 'approved'} onClick={() => setParam('status', 'approved')} />
          <Kpi label="Registered via affiliates" value={stats.data.totalRegistrations} />
        </div>
      ) : null}

      <div className="adm-toolbar">
        <label className="adm-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            {(Object.keys(STATUS_LABEL) as AffiliateApplicationStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field">
          <span>Type</span>
          <select value={type} onChange={(e) => setParam('type', e.target.value)}>
            <option value="">All</option>
            {(Object.keys(TYPE_LABEL) as AffiliateType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {list.status === 'error' ? <p className="adm-error" role="alert">{list.message}</p> : null}
      {list.status === 'ready' && list.data.items.length === 0 ? <p className="adm-muted">No applications match.</p> : null}

      {list.status === 'ready' && list.data.items.length > 0 ? (
        <>
          <div className="adm-tablewrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th className="num">Registered</th>
                  <th>Applied</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((a) => (
                  <tr key={a.id} className={cn(selected === a.id && 'is-selected')}>
                    <td>
                      <button type="button" className="adm-linkbtn" onClick={() => setSelected(a.id)}>
                        {a.name ?? 'No name yet'}
                      </button>
                    </td>
                    <td>{a.email ?? '—'}</td>
                    <td>
                      <TypeTag type={a.type} />
                    </td>
                    <td className="num">{a.registrationCount}</td>
                    <td>{formatWhen(a.createdAt)}</td>
                    <td>
                      <span className={cn('adm-status', `adm-status--a-${a.applicationStatus}`)}>{STATUS_LABEL[a.applicationStatus]}</span>
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
