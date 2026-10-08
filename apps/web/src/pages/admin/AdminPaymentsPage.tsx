import { useState } from 'react';
import type { AdminOrderRow, AdminOrderStatus, AdminPaymentProvider, Paginated, PaymentsSummary } from '@aiit/shared';
import { apiFetchBlob, downloadBlob } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { formatWhen, useAdminCourses, useAdminFetch } from './adminData';

const STATUS_OPTIONS: { value: AdminOrderStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PROVIDER_OPTIONS: { value: AdminPaymentProvider | ''; label: string }[] = [
  { value: '', label: 'All providers' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'paystack', label: 'Paystack' },
];

function statusTone(status: AdminOrderStatus): string {
  if (status === 'paid') return 'adm-tag--paid';
  if (status === 'failed' || status === 'cancelled') return 'adm-tag--failed';
  if (status === 'refunded') return 'adm-tag--refunded';
  return 'adm-tag--pending';
}

export default function AdminPaymentsPage() {
  const courses = useAdminCourses();
  const [status, setStatus] = useState<AdminOrderStatus | ''>('');
  const [provider, setProvider] = useState<AdminPaymentProvider | ''>('');
  const [courseId, setCourseId] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const summary = useAdminFetch<PaymentsSummary>('/admin/payments/summary');

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (provider) params.set('provider', provider);
  if (courseId) params.set('courseId', courseId);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  const orders = useAdminFetch<Paginated<AdminOrderRow>>(`/admin/payments/orders${qs ? `?${qs}` : ''}`);

  const courseList = courses.status === 'ready' ? courses.data : [];

  async function download() {
    setBusy(true);
    setError(undefined);
    try {
      downloadBlob(await apiFetchBlob('/admin/exports/payments'), 'aiit-payments.xlsx');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download that file.');
    } finally {
      setBusy(false);
    }
  }

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const totalPaidOrders = summary.status === 'ready' ? summary.data.ordersByStatus.paid : 0;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Revenue</p>
          <h1 className="adm-title">Payments</h1>
          <p className="adm-intro">
            Orders across all three providers. Revenue is shown per currency, never summed together -- PayPal
            settles in USD, Razorpay in INR, Paystack in NGN.
          </p>
        </div>
      </div>

      {summary.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {summary.status === 'error' ? (
        <p className="adm-error" role="alert">
          {summary.message}
        </p>
      ) : null}

      {summary.status === 'ready' ? (
        <section className="adm-panel" aria-labelledby="revenue-summary">
          <div className="adm-panel__head">
            <h2 id="revenue-summary">Revenue by currency</h2>
          </div>
          {summary.data.revenueByCurrency.length === 0 ? (
            <p className="adm-muted">No paid orders yet.</p>
          ) : (
            <div className="kpis">
              {summary.data.revenueByCurrency.map((r) => (
                <div key={r.currency} className="kpi">
                  <span className="kpi__label">{r.currency} revenue</span>
                  <span className="kpi__value">{formatPrice(r.amountCents, r.currency)}</span>
                  <span className="kpi__hint">
                    {r.orders} paid order{r.orders === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <h3 className="adm-form__title" style={{ marginTop: 'var(--space-5)' }}>
            By provider
          </h3>
          {summary.data.ordersByProvider.length === 0 ? (
            <p className="adm-muted">No paid orders yet.</p>
          ) : (
            <div className="adm-tablewrap">
              <table className="adm-table adm-table--rows">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Currency</th>
                    <th className="num">Paid orders</th>
                    <th className="num">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.data.ordersByProvider.map((r) => (
                    <tr key={`${r.provider}-${r.currency}`}>
                      <td style={{ textTransform: 'capitalize' }}>{r.provider}</td>
                      <td>{r.currency}</td>
                      <td className="num">{r.orders}</td>
                      <td className="num">{formatPrice(r.amountCents, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {summary.data.topCourses.length > 0 ? (
            <>
              <h3 className="adm-form__title" style={{ marginTop: 'var(--space-5)' }}>
                Top courses by paid orders
              </h3>
              <div className="adm-tablewrap">
                <table className="adm-table adm-table--rows">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.data.topCourses.map((c) => (
                      <tr key={c.courseId}>
                        <td>{c.courseTitle}</td>
                        <td>
                          {c.revenueByCurrency.map((r) => (
                            <span key={r.currency} style={{ marginRight: '1em' }}>
                              {formatPrice(r.amountCents, r.currency)} ({r.orders})
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="adm-panel" aria-labelledby="orders-list">
        <div className="adm-panel__head">
          <h2 id="orders-list">Orders</h2>
          <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={download}>
            {busy ? 'Preparing…' : 'Export all (.xlsx)'}
          </button>
        </div>
        {error ? (
          <p className="adm-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="adm-toolbar">
          <label className="adm-field">
            <span>Status</span>
            <select value={status} onChange={(e) => resetToFirstPage(setStatus)(e.target.value as AdminOrderStatus | '')}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Provider</span>
            <select value={provider} onChange={(e) => resetToFirstPage(setProvider)(e.target.value as AdminPaymentProvider | '')}>
              {PROVIDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Course</span>
            <select value={courseId} onChange={(e) => resetToFirstPage(setCourseId)(e.target.value)}>
              <option value="">All courses</option>
              {courseList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          {totalPaidOrders > 0 ? <p className="adm-muted">{totalPaidOrders} paid order{totalPaidOrders === 1 ? '' : 's'} total</p> : null}
        </div>

        {orders.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
        {orders.status === 'error' ? (
          <p className="adm-error" role="alert">
            {orders.message}
          </p>
        ) : null}
        {orders.status === 'ready' && orders.data.items.length === 0 ? <p className="adm-muted">No orders match these filters.</p> : null}

        {orders.status === 'ready' && orders.data.items.length > 0 ? (
          <>
            <div className="adm-tablewrap">
              <table className="adm-table adm-table--rows">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Provider</th>
                    <th className="num">Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.items.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.userName ?? 'Unknown'}
                        {o.userEmail ? <div className="adm-muted">{o.userEmail}</div> : null}
                      </td>
                      <td>{o.courseTitle}</td>
                      <td style={{ textTransform: 'capitalize' }}>{o.provider}</td>
                      <td className="num">{formatPrice(o.amountCents, o.currency)}</td>
                      <td>
                        <span className={`adm-tag ${statusTone(o.status)}`}>{o.status}</span>
                      </td>
                      <td>{formatWhen(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.data.total > orders.data.pageSize ? (
              <div className="adm-actions" style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <p className="adm-muted">
                  Page {orders.data.page} of {Math.max(1, Math.ceil(orders.data.total / orders.data.pageSize))}
                </p>
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  disabled={page * orders.data.pageSize >= orders.data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
