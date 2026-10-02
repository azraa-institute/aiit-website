import { useState } from 'react';
import type { AffiliateType } from '@aiit/shared';
import { cn } from '@/lib/cn';
import { useAffiliateMe } from './affiliateData';

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

const STATUS_LABEL = {
  pending: 'Pending review',
  in_review: 'Under review',
  approved: 'Approved',
  rejected: 'Not approved',
} as const;

export default function AffiliateDashboardPage() {
  const state = useAffiliateMe();
  const [copied, setCopied] = useState(false);

  if (state.status === 'loading') return <p className="adm-muted">Loading your affiliate status…</p>;
  if (state.status === 'error') {
    return (
      <>
        <p className="adm-error" role="alert">
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

  async function copyLink() {
    if (!data.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable -- the link is still shown as selectable text */
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">{TYPE_LABEL[data.type]}</p>
          <h1 className="adm-title">Your affiliate dashboard</h1>
          <p className="adm-intro">{TYPE_INTRO[data.type]}</p>
        </div>
      </div>

      <div className="adm-statusrow">
        <span className={cn('adm-status', `adm-status--a-${data.applicationStatus}`)}>{STATUS_LABEL[data.applicationStatus]}</span>
      </div>

      {data.applicationStatus === 'pending' || data.applicationStatus === 'in_review' ? (
        <section className="adm-panel">
          <div className="adm-panel__head">
            <h2>Your application is being screened</h2>
          </div>
          <p className="adm-muted">
            The AIIT team reviews every affiliate application by hand. Check back here any time -- this page always
            shows your current status, and we&apos;ll email you the moment a decision is made.
          </p>
        </section>
      ) : null}

      {data.applicationStatus === 'rejected' ? (
        <section className="adm-panel">
          <div className="adm-panel__head">
            <h2>This application wasn&apos;t approved</h2>
          </div>
          <p className="adm-muted">{data.rejectionReason ?? 'No reason was given.'}</p>
        </section>
      ) : null}

      {data.applicationStatus === 'approved' && data.referralLink ? (
        <>
          <div className="kpis">
            <div className="kpi">
              <span className="kpi__label">Registered via your link</span>
              <span className="kpi__value">{(data.registrationCount ?? 0).toLocaleString()}</span>
              <span className="kpi__hint">people who signed up after clicking it</span>
            </div>
          </div>

          <section className="adm-panel">
            <div className="adm-panel__head">
              <h2>Your referral link</h2>
              <p className="adm-muted">Share this instead of a code -- anyone who signs up after clicking it is attributed to you automatically.</p>
            </div>
            <p className="adm-card__meta" style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>
              {data.referralLink}
            </p>
            <button type="button" className="adm-btn adm-btn--primary" onClick={copyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
