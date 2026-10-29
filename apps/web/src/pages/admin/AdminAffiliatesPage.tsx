import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type {
  AdminAffiliateCredentials,
  AdminAffiliateDetail,
  AdminAffiliateStats,
  AdminAffiliateSummary,
  AffiliateApplicationStatus,
  AffiliateSocialLink,
  AffiliateType,
  Paginated,
} from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { CheckboxGroupField } from '@/components/common/Field';
import { CopyButton } from '@/components/common/CopyButton';
import { Avatar } from '@/components/common/Avatar';
import { formatWhen, useAdminFetch, useAdminFxRates } from './adminData';
import {
  UsersIcon,
  ShieldCheckIcon,
  CalendarIcon,
  LinkIcon,
  TagIcon,
  TicketIcon,
  BankIcon,
  PencilIcon,
  PhoneIcon,
  PinIcon,
  DocumentIcon,
  BarChartIcon,
  ExternalLinkIcon,
} from './AdminAffiliatesIcons';

const SOCIAL_PLATFORM_LABELS: Record<AffiliateSocialLink['platform'], string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  other: 'Other profile',
};

function socialPlatformLabel(platform: AffiliateSocialLink['platform']): string {
  return SOCIAL_PLATFORM_LABELS[platform] ?? 'Profile';
}

/**
 * Only YouTube ever gets a real server-side check (see YoutubeClientService's
 * doc comment for why) -- every other platform's `fetchStatus` stays
 * 'unsupported', so this always has something honest to say rather than
 * implying a check happened when it didn't.
 */
function describeFollowerVerification(link: AffiliateSocialLink): string {
  const reported = link.followersReported != null ? `${link.followersReported.toLocaleString()} reported` : 'No follower count given';
  if (link.fetchStatus === 'fetched' && link.followersFetched != null) {
    return `${reported} · ${link.followersFetched.toLocaleString()} verified`;
  }
  if (link.fetchStatus === 'failed') return `${reported} · verification failed, check manually`;
  return `${reported} · verification not available for this platform`;
}

/** FX symbols for the currencies CurrencyService converts for this drawer -- see DISPLAY_CURRENCIES on the API side. */
const FX_SYMBOL: Record<string, string> = { NGN: '₦', INR: '₹' };

function formatFx(usdCents: number, rates: Record<string, number>): string | null {
  const parts = Object.entries(FX_SYMBOL)
    .filter(([code]) => rates[code] !== undefined)
    .map(([code, symbol]) => {
      const amount = (usdCents / 100) * rates[code];
      return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    });
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** A label cell with a small brass icon in front -- every row in the affiliate detail table gets one, matching the reference design. */
function RowLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="adm-dl__label">
      <span className="adm-dl__icon">{icon}</span>
      {children}
    </span>
  );
}

/** One figure in a stat-row: a muted label on top, a bold value, and an optional smaller sub-line (a unit, or FX conversions). */
function Stat({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="adm-stat2">
      <span className="adm-stat2__label">{label}</span>
      <span className="adm-stat2__value">{value}</span>
      {sub ? <span className="adm-stat2__sub">{sub}</span> : null}
    </div>
  );
}

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

/** One affiliate can now hold several types at once -- renders one tag per type, flex-wrapped. */
function TypeTags({ types }: { types: AffiliateType[] }) {
  return (
    <span className="adm-tag-group">
      {types.map((t) => (
        <TypeTag key={t} type={t} />
      ))}
    </span>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYOUT_METHOD_LABEL: Record<string, string> = { paypal: 'PayPal', bank: 'Bank transfer' };

/** A real two-column mini-table (payment method as the header row, then one row per field) rather than a run-on sentence -- easier to scan when an admin is actually keying a transfer in. */
function PayoutDetails({ details }: { details: AdminAffiliateDetail['payoutDetails'] }) {
  if (!details) return <>Not submitted yet</>;

  const rows: [string, string | undefined][] =
    details.method === 'paypal'
      ? [['Email', details.paypalEmail]]
      : [
          ['Account name', details.bankAccountName],
          ['Account number', details.bankAccountNumber],
          ['Bank name', details.bankName],
          ['Bank code', details.bankCode],
          ['Country', details.bankCountry],
        ];

  return (
    <div className="adm-paytable">
      <div className="adm-paytable__row adm-paytable__row--head">
        <div className="adm-paytable__label">Payment method</div>
        <div className="adm-paytable__value">{PAYOUT_METHOD_LABEL[details.method] ?? details.method}</div>
      </div>
      {rows
        .filter((row): row is [string, string] => Boolean(row[1]))
        .map(([label, value]) => (
          <div className="adm-paytable__row" key={label}>
            <div className="adm-paytable__label">{label}</div>
            <div className="adm-paytable__value">{value}</div>
          </div>
        ))}
    </div>
  );
}

/** An admin recording a payout they already sent themselves (PayPal/bank transfer, outside this system) -- never moves money, see AdminAffiliatesService.recordPayout(). */
function RecordPayoutForm({ affiliateId, onRecorded }: { affiliateId: string; onRecorded: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await apiFetch(`/admin/affiliates/${affiliateId}/payouts`, {
        method: 'POST',
        body: JSON.stringify({ amountDollars: Number(amount), note: note.trim() || undefined }),
      });
      setAmount('');
      setNote('');
      onRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record that payout.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      <div className="adm-grid">
        <label className="adm-field">
          <span>Amount paid (USD)</span>
          <input type="number" min={1} step={1} required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="adm-field adm-field--wide">
          <span>Note (optional)</span>
          <input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. October payout via PayPal" />
        </label>
      </div>
      {error ? <p className="adm-error" role="alert">{error}</p> : null}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || !amount}>
          {busy ? 'Recording…' : 'Record payout'}
        </button>
      </div>
    </form>
  );
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
  const fx = useAdminFxRates();
  const fxRates = fx.status === 'ready' ? fx.data.rates : {};
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
    <aside className="adm-drawer adm-drawer--wide" aria-label="Affiliate application details">
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
          <div className="adm-drawer__who">
            <Avatar name={state.data.name} size="md" className="adm-drawer__avatar" />
            <div>
              <h3 className="adm-drawer__name">{state.data.name ?? 'No name yet'}</h3>
              <p className="adm-muted">{state.data.email ?? 'No email on record'}</p>
              <p className="adm-muted">
                <Link to={`/admin/students?referredByAffiliateId=${state.data.id}`} className="adm-linkbtn">
                  View the students they referred ({state.data.registrationCount})
                  <ExternalLinkIcon className="adm-linkbtn__icon" />
                </Link>
              </p>
            </div>
          </div>

          <dl className="adm-dl">
            <div>
              <dt>
                <RowLabel icon={<UsersIcon />}>Type</RowLabel>
              </dt>
              <dd>
                <TypeTags types={state.data.types} />
              </dd>
            </div>
            <div>
              <dt>
                <RowLabel icon={<ShieldCheckIcon />}>Status</RowLabel>
              </dt>
              <dd>
                <span className={cn('adm-status', `adm-status--a-${state.data.applicationStatus}`)}>
                  {STATUS_LABEL[state.data.applicationStatus]}
                </span>
              </dd>
            </div>
            <div>
              <dt>
                <RowLabel icon={<CalendarIcon />}>Applied</RowLabel>
              </dt>
              <dd>{formatWhen(state.data.createdAt)}</dd>
            </div>
            {state.data.earnings.studentReferrals ? (
              <div>
                <dt>
                  <RowLabel icon={<UsersIcon />}>{state.data.studentReferralLinkLabel ?? 'Student referrals'}</RowLabel>
                </dt>
                <dd>
                  <div className="adm-statrow">
                    <Stat label="Signed up" value={String(state.data.earnings.studentReferrals.totalCount)} sub="students" />
                    <Stat label="Onboarded (paid)" value={String(state.data.earnings.studentReferrals.eligibleCount)} sub="students" />
                    <Stat
                      label="Estimated earnings"
                      value={formatCents(state.data.earnings.studentReferrals.estimatedCents)}
                      sub={formatFx(state.data.earnings.studentReferrals.estimatedCents, fxRates)}
                    />
                  </div>
                </dd>
              </div>
            ) : null}
            {state.data.earnings.affiliateReferrals ? (
              <div>
                <dt>
                  <RowLabel icon={<UsersIcon />}>Affiliate referrals</RowLabel>
                </dt>
                <dd>
                  <div className="adm-statrow">
                    <Stat label="Applied with coupon" value={String(state.data.earnings.affiliateReferrals.totalCount)} />
                    <Stat label="Successful" value={String(state.data.earnings.affiliateReferrals.eligibleCount)} />
                    <Stat
                      label="Estimated earnings"
                      value={formatCents(state.data.earnings.affiliateReferrals.estimatedCents)}
                      sub={formatFx(state.data.earnings.affiliateReferrals.estimatedCents, fxRates)}
                    />
                  </div>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>
                <RowLabel icon={<BarChartIcon />}>Total estimated earned</RowLabel>
              </dt>
              <dd>
                <div className="adm-statrow">
                  <Stat
                    label="Total estimated"
                    value={formatCents(state.data.earnings.estimatedCents)}
                    sub={formatFx(state.data.earnings.estimatedCents, fxRates)}
                  />
                  <Stat
                    label="Total paid"
                    value={formatCents(state.data.earnings.paidCents)}
                    sub={formatFx(state.data.earnings.paidCents, fxRates)}
                  />
                  <Stat
                    label="Total owed"
                    value={formatCents(state.data.earnings.owedCents)}
                    sub={formatFx(state.data.earnings.owedCents, fxRates)}
                  />
                </div>
              </dd>
            </div>
            <div>
              <dt>
                <RowLabel icon={<LinkIcon />}>Referral link</RowLabel>
              </dt>
              <dd>
                {state.data.referralLink ? (
                  <span className="adm-copyrow">
                    <code className="adm-code">{state.data.referralLink}</code>
                    <CopyButton value={state.data.referralLink} title="Copy referral link" />
                  </span>
                ) : (
                  'Not unlocked yet (not approved, or reference code not activated)'
                )}
              </dd>
            </div>
            <div>
              <dt>
                <RowLabel icon={<TagIcon />}>Affiliate coupon code</RowLabel>
              </dt>
              <dd>
                {state.data.affiliateCouponCode ? (
                  <span className="adm-copyrow">
                    <code className="adm-code">{state.data.affiliateCouponCode}</code>
                    <CopyButton value={state.data.affiliateCouponCode} title="Copy coupon code" />
                  </span>
                ) : (
                  'Not unlocked yet (not approved, or reference code not activated)'
                )}
              </dd>
            </div>
            <div>
              <dt>
                <RowLabel icon={<TicketIcon />}>Reference code</RowLabel>
              </dt>
              <dd>
                <span className="adm-copyrow">
                  {state.data.referenceCode ? (
                    <>
                      <code className="adm-code">{state.data.referenceCode}</code>
                      <CopyButton value={state.data.referenceCode} title="Copy reference code" />
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                {state.data.activatedAt ? ` · activated ${formatWhen(state.data.activatedAt)}` : ' · not yet activated'}
              </dd>
            </div>
            {state.data.referredBy ? (
              <div>
                <dt>
                  <RowLabel icon={<UsersIcon />}>Referred by</RowLabel>
                </dt>
                <dd>{state.data.referredBy.name ?? state.data.referredBy.email ?? state.data.referredBy.id} (affiliate-to-affiliate coupon)</dd>
              </div>
            ) : null}
            <div>
              <dt>
                <RowLabel icon={<BankIcon />}>Payout details</RowLabel>
              </dt>
              <dd>
                <PayoutDetails details={state.data.payoutDetails} />
              </dd>
            </div>
            <div>
              <dt>
                <RowLabel icon={<PencilIcon />}>Signature</RowLabel>
              </dt>
              <dd>{state.data.signedName ? `${state.data.signedName}${state.data.signedAt ? ` · ${formatWhen(state.data.signedAt)}` : ''}` : 'Not on file (applied before e-signature)'}</dd>
            </div>
            {state.data.phone ? (
              <div>
                <dt>
                  <RowLabel icon={<PhoneIcon />}>Phone</RowLabel>
                </dt>
                <dd>{state.data.phone}</dd>
              </div>
            ) : null}
            {state.data.handle ? (
              <div>
                <dt>
                  <RowLabel icon={<TagIcon />}>Social handle</RowLabel>
                </dt>
                <dd>{state.data.handle}</dd>
              </div>
            ) : null}
            {state.data.socialLinks.map((link, i) => (
              <div key={`${link.platform}-${i}`}>
                <dt>
                  <RowLabel icon={<TagIcon />}>{socialPlatformLabel(link.platform)}</RowLabel>
                </dt>
                <dd>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="adm-linkbtn">
                    {link.url}
                    <ExternalLinkIcon className="adm-linkbtn__icon" />
                  </a>
                  <br />
                  <span className="adm-muted">{describeFollowerVerification(link)}</span>
                </dd>
              </div>
            ))}
            {state.data.country || state.data.state || state.data.city ? (
              <div>
                <dt>
                  <RowLabel icon={<PinIcon />}>Location</RowLabel>
                </dt>
                <dd>{[state.data.city, state.data.state, state.data.country].filter(Boolean).join(', ')}</dd>
              </div>
            ) : null}
            {state.data.source ? (
              <div>
                <dt>
                  <RowLabel icon={<UsersIcon />}>Heard about us via</RowLabel>
                </dt>
                <dd>{state.data.source}</dd>
              </div>
            ) : null}
            {state.data.motivation ? (
              <div>
                <dt>
                  <RowLabel icon={<DocumentIcon />}>About them / their audience</RowLabel>
                </dt>
                <dd>{state.data.motivation}</dd>
              </div>
            ) : null}
            {state.data.reviewedAt ? (
              <div>
                <dt>
                  <RowLabel icon={<DocumentIcon />}>Reviewed</RowLabel>
                </dt>
                <dd>
                  {formatWhen(state.data.reviewedAt)} {state.data.reviewedByName ? `by ${state.data.reviewedByName}` : ''}
                </dd>
              </div>
            ) : null}
            {state.data.applicationStatus === 'rejected' && state.data.rejectionReason ? (
              <div>
                <dt>
                  <RowLabel icon={<DocumentIcon />}>Reason given</RowLabel>
                </dt>
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

          <h3 className="adm-drawer__sub">Payouts</h3>
          <p className="adm-muted">
            No live payment integration: pay the affiliate yourself via their payout details above, then record it
            here.
          </p>
          <RecordPayoutForm affiliateId={state.data.id} onRecorded={state.reload} />
          {state.data.payouts.length > 0 ? (
            <ul className="adm-plain" role="list">
              {state.data.payouts.map((p) => (
                <li key={p.id}>
                  {formatCents(p.amountCents)} · {formatWhen(p.paidAt)}
                  {p.recordedByName ? ` · recorded by ${p.recordedByName}` : ''}
                  {p.note ? ` · ${p.note}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-muted">No payouts recorded yet.</p>
          )}
        </>
      ) : null}
    </aside>
  );
}

/**
 * For someone AIIT already has a relationship with outside the public
 * application form (an existing partner/creator, or someone whose own
 * application got stuck) -- creates their account + an Affiliate row
 * directly, no e-signature collected (see AffiliatesService.createManually()
 * on the backend for why), defaulting to "approved" since the whole point
 * is skipping the review queue for someone already vetted. They're emailed
 * a one-time password and asked to set their own on first sign-in, same as
 * a manually-created instructor/admin account.
 */
function AddAffiliateForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [types, setTypes] = useState<AffiliateType[]>(['creator']);
  const [status, setStatus] = useState<AffiliateApplicationStatus>('approved');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [motivation, setMotivation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<AdminAffiliateCredentials>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const created = await apiFetch<AdminAffiliateCredentials>('/admin/affiliates', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          types,
          status,
          phone: phone.trim() || undefined,
          country: country.trim() || undefined,
          motivation: motivation.trim() || undefined,
        }),
      });
      setResult(created);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this affiliate.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="adm-drawer" aria-label="Add an affiliate manually">
      <div className="adm-drawer__head">
        <h2>Add affiliate manually</h2>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>

      {result ? (
        <>
          <p className="adm-notice" role="status">
            Done. We've emailed <strong>{result.affiliate.email}</strong> their login details and a one-time
            password; they'll be asked to set their own the moment they sign in.
          </p>
          <dl className="adm-dl">
            <div>
              <dt>Email</dt>
              <dd>{result.affiliate.email}</dd>
            </div>
            <div>
              <dt>Temporary password</dt>
              <dd>
                <span className="adm-copyrow">
                  <code className="adm-code">{result.temporaryPassword}</code>
                  <CopyButton value={result.temporaryPassword} title="Copy temporary password" />
                </span>
              </dd>
            </div>
          </dl>
          <p className="adm-muted">This password is shown once. Keep a copy if you need to relay it yourself.</p>
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
              <span>Full name</span>
              <input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="adm-field adm-field--wide">
              <span>Email address</span>
              <input required type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <CheckboxGroupField
              label="Type (select all that apply)"
              className="adm-field--wide"
              options={(Object.keys(TYPE_LABEL) as AffiliateType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              value={types}
              onChange={(next) => setTypes(next as AffiliateType[])}
            />
            <label className="adm-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as AffiliateApplicationStatus)}>
                {(Object.keys(STATUS_LABEL) as AffiliateApplicationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Phone (optional)</span>
              <input maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Country (optional)</span>
              <input maxLength={100} value={country} onChange={(e) => setCountry(e.target.value)} />
            </label>
            <label className="adm-field adm-field--wide">
              <span>Notes (optional)</span>
              <textarea rows={3} maxLength={1000} value={motivation} onChange={(e) => setMotivation(e.target.value)} />
            </label>
          </div>
          {error ? <p className="adm-error" role="alert">{error}</p> : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || types.length === 0}>
              {busy ? 'Adding…' : 'Add affiliate'}
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}

export default function AdminAffiliatesPage() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setAdding(true)}>
          Add affiliate manually
        </button>
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
                      <TypeTags types={a.types} />
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
      {adding ? <AddAffiliateForm onDone={list.reload} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
