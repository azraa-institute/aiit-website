import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminPromoCodeDetail, AdminPromoCodeSummary, CourseListItem } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { CheckboxGroupField } from '@/components/common/Field';
import { CopyButton } from '@/components/common/CopyButton';
import { formatWhen, useAdminCourses, useAdminFetch } from './adminData';

function formatRupees(cents: number): string {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export default function AdminPromoCodesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const list = useAdminFetch<AdminPromoCodeSummary[]>('/admin/promo-codes');

  function reloadAndClose() {
    list.reload();
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Finance</p>
          <h1 className="adm-title">Promo codes</h1>
          <p className="adm-intro">
            Discount codes for course bundles, capped at a maximum number of successful payments. A code is never
            shown anywhere on the public site -- only here, and only once you generate or open it.
          </p>
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setGenerating(true)}>
          Generate code
        </button>
      </div>

      {list.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {list.status === 'error' ? (
        <p className="adm-error" role="alert">
          {list.message}
        </p>
      ) : null}
      {list.status === 'ready' && list.data.length === 0 ? <p className="adm-muted">No promo codes yet.</p> : null}

      {list.status === 'ready' && list.data.length > 0 ? (
        <div className="adm-tablewrap">
          <table className="adm-table adm-table--rows">
            <thead>
              <tr>
                <th>Code</th>
                <th>Courses</th>
                <th>Price</th>
                <th className="num">Redemptions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((p) => (
                <tr key={p.id} className={cn(selected === p.id && 'is-selected')}>
                  <td>
                    <button type="button" className="adm-linkbtn" onClick={() => setSelected(p.id)}>
                      <code className="adm-code">{p.code.toUpperCase()}</code>
                    </button>
                  </td>
                  <td>{p.courseTitles.join(', ')}</td>
                  <td>
                    {formatRupees(p.singlePriceCents)} · {formatRupees(p.bundlePriceCents)} bundle
                  </td>
                  <td className="num">
                    {p.paidRedemptionCount} / {p.maxRedemptions}
                  </td>
                  <td>
                    <span className={cn('adm-status', p.active ? 'adm-status--active' : 'adm-status--suspended')}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? <Detail id={selected} onChanged={list.reload} onClose={() => setSelected(null)} /> : null}
      {generating ? <GenerateForm onDone={reloadAndClose} onClose={() => setGenerating(false)} /> : null}
    </div>
  );
}

function Detail({ id, onChanged, onClose }: { id: string; onChanged: () => void; onClose: () => void }) {
  const detail = useAdminFetch<AdminPromoCodeDetail>(`/admin/promo-codes/${id}`);
  const [busy, setBusy] = useState(false);

  async function toggleActive(current: AdminPromoCodeDetail) {
    setBusy(true);
    try {
      await apiFetch(`/admin/promo-codes/${id}`, { method: 'PATCH', body: JSON.stringify({ active: !current.active }) });
      detail.reload();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="adm-drawer adm-drawer--wide" aria-label="Promo code detail">
      <div className="adm-drawer__head">
        <h2>Promo code</h2>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>

      {detail.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {detail.status === 'error' ? (
        <p className="adm-error" role="alert">
          {detail.message}
        </p>
      ) : null}

      {detail.status === 'ready' ? (
        <>
          <dl className="adm-dl">
            <div>
              <dt>Code</dt>
              <dd>
                <span className="adm-copyrow">
                  <code className="adm-code">{detail.data.code.toUpperCase()}</code>
                  <CopyButton value={detail.data.code.toUpperCase()} title="Copy promo code" />
                </span>
              </dd>
            </div>
            <div>
              <dt>Applies to</dt>
              <dd>{detail.data.courseTitles.join(', ')}</dd>
            </div>
            <div>
              <dt>Price (1 or 2 courses)</dt>
              <dd>{formatRupees(detail.data.singlePriceCents)} per course</dd>
            </div>
            <div>
              <dt>Price (all {detail.data.courseTitles.length} courses)</dt>
              <dd>{formatRupees(detail.data.bundlePriceCents)} per course</dd>
            </div>
            <div>
              <dt>Redemptions</dt>
              <dd>
                {detail.data.paidRedemptionCount} of {detail.data.maxRedemptions} used
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={cn('adm-status', detail.data.active ? 'adm-status--active' : 'adm-status--suspended')}>
                  {detail.data.active ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatWhen(detail.data.createdAt)}</dd>
            </div>
          </dl>

          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => toggleActive(detail.data)}>
              {detail.data.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>

          <h3 className="adm-eyebrow" style={{ marginTop: 'var(--space-6)' }}>
            Redemptions
          </h3>
          {detail.data.redemptions.length === 0 ? (
            <p className="adm-muted">No successful redemptions yet.</p>
          ) : (
            <div className="adm-tablewrap">
              <table className="adm-table adm-table--rows">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="num">Courses</th>
                    <th className="num">Amount</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.redemptions.map((r) => (
                    <tr key={r.providerRef}>
                      <td>
                        {r.userName ?? 'No name yet'}
                        {r.userEmail ? <span className="adm-muted"> · {r.userEmail}</span> : null}
                      </td>
                      <td className="num">{r.courseCount}</td>
                      <td className="num">{formatRupees(r.amountCents)}</td>
                      <td>{formatWhen(r.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </aside>
  );
}

function GenerateForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const courses = useAdminCourses();
  const [code, setCode] = useState('');
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [singlePriceRupees, setSinglePriceRupees] = useState('11000');
  const [bundlePriceRupees, setBundlePriceRupees] = useState('7000');
  const [maxRedemptions, setMaxRedemptions] = useState('300');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<AdminPromoCodeDetail>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const created = await apiFetch<AdminPromoCodeDetail>('/admin/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim() || undefined,
          courseIds,
          singlePriceCents: Math.round(Number(singlePriceRupees) * 100),
          bundlePriceCents: Math.round(Number(bundlePriceRupees) * 100),
          maxRedemptions: Number(maxRedemptions),
        }),
      });
      setResult(created);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate this promo code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="adm-drawer" aria-label="Generate a promo code">
      <div className="adm-drawer__head">
        <h2>Generate a promo code</h2>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>

      {result ? (
        <>
          <p className="adm-notice" role="status">
            Done. Share this code with students yourself -- it's never shown anywhere on the public site.
          </p>
          <dl className="adm-dl">
            <div>
              <dt>Code</dt>
              <dd>
                <span className="adm-copyrow">
                  <code className="adm-code">{result.code.toUpperCase()}</code>
                  <CopyButton value={result.code.toUpperCase()} title="Copy promo code" />
                </span>
              </dd>
            </div>
          </dl>
          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      ) : (
        <form className="adm-form" onSubmit={onSubmit}>
          <div className="adm-grid">
            <label className="adm-field adm-field--wide">
              <span>Code (optional -- leave blank to auto-generate)</span>
              <input maxLength={40} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MBA2027" />
            </label>

            {courses.status === 'ready' ? (
              <CheckboxGroupField
                label="Applies to"
                className="adm-field--wide"
                options={courses.data.map((c: CourseListItem) => ({ value: c.id, label: c.title }))}
                value={courseIds}
                onChange={setCourseIds}
              />
            ) : (
              <p className="adm-muted">Loading courses…</p>
            )}

            <label className="adm-field">
              <span>Price for 1-2 courses (₹)</span>
              <input required type="number" min={1} value={singlePriceRupees} onChange={(e) => setSinglePriceRupees(e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Price when all are bought together (₹)</span>
              <input required type="number" min={1} value={bundlePriceRupees} onChange={(e) => setBundlePriceRupees(e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Maximum redemptions</span>
              <input required type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
            </label>
          </div>
          {error ? (
            <p className="adm-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || courseIds.length === 0}>
              {busy ? 'Generating…' : 'Generate code'}
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
