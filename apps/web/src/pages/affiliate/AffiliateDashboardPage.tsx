import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { AffiliateApplicationStatus, AffiliateMe, AffiliateType } from '@aiit/shared';
import { cn } from '@/lib/cn';
import { apiFetch, apiFetchBlob, downloadBlob, ApiError } from '@/lib/api';
import { useAffiliateMe } from './affiliateData';
import { formatCents } from './affiliateFormat';
import './affiliate-portal.css';

const TYPE_LABEL: Record<AffiliateType, string> = {
  creator: 'Creator',
  student: 'Student referrer',
  affiliate_to_affiliate: 'Affiliate-to-affiliate',
};

const TYPE_INTRO: Record<AffiliateType, string> = {
  creator: 'You introduce content creators to AIIT.',
  student: 'You refer students directly to AIIT.',
  affiliate_to_affiliate: 'You bring other affiliates into the programme.',
};

const STEPS = [
  { key: 'pending', label: 'Applied' },
  { key: 'in_review', label: 'Under review' },
  { key: 'approved', label: 'Approved' },
] satisfies { key: AffiliateApplicationStatus; label: string }[];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Applied -> Under review -> Approved, with the current stage highlighted. Not shown for a rejected application, that's a terminal state outside this happy path, not "stuck" on a step. */
function StatusStepper({ status }: { status: AffiliateApplicationStatus }) {
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="aff-stepper" role="list">
      {STEPS.map((s, i) => (
        <li key={s.key} className={cn('aff-stepper__step', i < activeIndex && 'is-done', i === activeIndex && 'is-active')}>
          <span className="aff-stepper__dot" aria-hidden="true">
            {i < activeIndex ? <CheckIcon /> : i + 1}
          </span>
          <span className="aff-stepper__label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Approved but not yet activated: the referral link stays hidden until the applicant enters the reference code emailed to them at application time (see AffiliatesService.activate()). */
function ActivationCard({ onActivated }: { onActivated: (me: AffiliateMe) => void }) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      const me = await apiFetch<AffiliateMe>('/affiliates/activate', { method: 'POST', body: JSON.stringify({ referenceCode: code.trim() }) });
      onActivated(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not activate your referral link right now.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResendState('sending');
    try {
      await apiFetch('/affiliates/reference-code/resend', { method: 'POST' });
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  }

  return (
    <section className="aff-card aff-card--status">
      <h2>Activate your referral link</h2>
      <p>
        You&apos;re approved. Enter the reference code from the email we sent when you applied to unlock your
        personal referral link.
      </p>
      <form className="aff-activate" onSubmit={onSubmit}>
        {error ? (
          <p className="aff-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="aff-activate__label" htmlFor="referenceCode">
          Reference code
        </label>
        <div className="aff-activate__row">
          <input
            id="referenceCode"
            className="aff-activate__input"
            name="referenceCode"
            placeholder="AIIT-AFF-XXXXXX"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit" className="adm-btn adm-btn--primary" disabled={submitting || code.trim().length === 0}>
            {submitting ? 'Activating…' : 'Activate'}
          </button>
        </div>
      </form>
      <button type="button" className="aff-activate__resend" onClick={resend} disabled={resendState === 'sending'}>
        {resendState === 'sent' ? 'Reference code resent, check your email' : resendState === 'error' ? 'Could not resend, try again' : 'Lost your code? Resend it'}
      </button>
    </section>
  );
}

export default function AffiliateDashboardPage() {
  const state = useAffiliateMe();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();

  if (state.status === 'loading') return <p className="aff-loading">Loading your affiliate status…</p>;
  if (state.status === 'error') {
    return (
      <>
        <p className="aff-error" role="alert">
          {state.error.message}
        </p>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={state.refetch}>
          Try again
        </button>
      </>
    );
  }

  const { data } = state;
  if (!data.hasApplied || !data.type || !data.applicationStatus) return null; // RequireAffiliate already redirects this case away

  const rejected = data.applicationStatus === 'rejected';
  const approved = data.applicationStatus === 'approved';

  async function downloadAgreement() {
    setDownloading(true);
    setDownloadError(undefined);
    try {
      const blob = await apiFetchBlob('/affiliates/me/agreement.pdf');
      downloadBlob(blob, 'AIIT-Affiliate-Agreement.pdf');
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : 'Could not download your signed agreement.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="aff-dash">
      <header className="aff-hero">
        <div className="aff-hero__seal" aria-hidden="true">
          <img src="/assets/legal/az-seal-brass.webp" alt="" />
        </div>
        <p className="aff-hero__eyebrow">{TYPE_LABEL[data.type]}</p>
        <h1 className="aff-hero__title">Your affiliate dashboard</h1>
        <p className="aff-hero__intro">{TYPE_INTRO[data.type]}</p>
      </header>

      {!rejected ? <StatusStepper status={data.applicationStatus} /> : null}

      {data.applicationStatus === 'pending' || data.applicationStatus === 'in_review' ? (
        <section className="aff-card aff-card--status">
          <h2>Your application is being screened</h2>
          <p>
            The AIIT team reviews every affiliate application by hand. Check back here any time, this page always
            shows your current status, and we&apos;ll email you the moment a decision is made.
          </p>
        </section>
      ) : null}

      {rejected ? (
        <section className="aff-card aff-card--rejected">
          <h2>This application wasn&apos;t approved</h2>
          <p>{data.rejectionReason ?? 'No reason was given.'}</p>
        </section>
      ) : null}

      {approved && !data.activated ? <ActivationCard onActivated={() => state.refetch()} /> : null}

      {approved && data.activated && data.referralLink ? (
        <>
          <div className="aff-stats-row">
            <section className="aff-stat">
              <span className="aff-stat__value">{(data.registrationCount ?? 0).toLocaleString()}</span>
              <span className="aff-stat__label">registered via your link</span>
            </section>
            {data.earnings?.estimatedCents != null ? (
              <>
                <section className="aff-stat">
                  <span className="aff-stat__value">{formatCents(data.earnings.estimatedCents)}</span>
                  <span className="aff-stat__label">estimated earned</span>
                </section>
                <section className="aff-stat">
                  <span className="aff-stat__value">{formatCents(data.earnings.paidCents)}</span>
                  <span className="aff-stat__label">paid out so far</span>
                </section>
                <section className="aff-stat">
                  <span className="aff-stat__value">{formatCents(data.earnings.owedCents ?? 0)}</span>
                  <span className="aff-stat__label">still owed</span>
                </section>
              </>
            ) : null}
          </div>
          {data.earnings?.estimatedCents != null ? (
            <p className="aff-card__footnote">
              Estimated from AIIT&apos;s published rates and your verified registrations -- the AIIT team confirms the
              exact figure before paying out.
            </p>
          ) : null}

          <div className="aff-quicklinks">
            <Link to="/affiliate-portal/link" className="aff-card aff-card--link">
              <h2>Your referral link</h2>
              <p>Get your shareable link and copy it for your audience.</p>
              <span className="aff-card__cta">Open →</span>
            </Link>
            <Link to="/affiliate-portal/payout" className="aff-card aff-card--link">
              <h2>Payout details</h2>
              <p>{data.payoutDetails ? 'Review or update where AIIT sends your earnings.' : 'Set up where AIIT should send your earnings.'}</p>
              <span className="aff-card__cta">Open →</span>
            </Link>
          </div>
        </>
      ) : null}

      <section className="aff-card">
        <h2>Your signed agreement</h2>
        <p>
          A copy of the Affiliate Agreement exactly as you signed it, with your typed signature and the date,
          available regardless of your application&apos;s status.
        </p>
        {downloadError ? (
          <p className="aff-error" role="alert">
            {downloadError}
          </p>
        ) : null}
        <button type="button" className="adm-btn adm-btn--primary" disabled={downloading} onClick={downloadAgreement}>
          {downloading ? 'Preparing…' : 'Download your signed agreement (PDF)'}
        </button>
      </section>
    </div>
  );
}
