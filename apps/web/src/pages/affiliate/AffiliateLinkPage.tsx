import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useAffiliateMe } from './affiliateData';
import './affiliate-portal.css';

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 10.5V3.5a1 1 0 0 1 1-1h7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One copy-to-clipboard box, reused for both the referral link and the coupon code -- same `.aff-linkbox` markup/CSS, just the value and copy state are per-instance. */
function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable, the value is still shown as selectable text */
    }
  }

  return (
    <div className="aff-linkbox">
      <code>{value}</code>
      <button type="button" className={cn('aff-linkbox__copy', copied && 'is-copied')} onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function AffiliateLinkPage() {
  const state = useAffiliateMe();

  if (state.status === 'loading') return <p className="aff-loading">Loading…</p>;
  if (state.status === 'error') {
    return (
      <p className="aff-error" role="alert">
        {state.error.message}
      </p>
    );
  }

  const { data } = state;
  if (!data.referralLink && !data.affiliateCouponCode) {
    return (
      <section className="aff-card">
        <h2>Your referral tools</h2>
        <p>Your referral link and/or coupon code unlock once your application is approved and activated -- head back to the Dashboard.</p>
      </section>
    );
  }

  return (
    <div className="aff-dash">
      {/* One titled section per type held -- an affiliate with 2 or 3 types sees each tool separately, not one ambiguous box. */}
      {data.referralLink ? (
        <section className="aff-card">
          <h2>{data.studentReferralLinkLabel}</h2>
          <p>Share this instead of a code, anyone who signs up after clicking it is attributed to you automatically.</p>
          <CopyBox value={data.referralLink} />
          <p className="aff-card__footnote">{(data.registrationCount ?? 0).toLocaleString()} people have registered via this link so far.</p>
        </section>
      ) : null}

      {data.affiliateCouponCode ? (
        <section className="aff-card">
          <h2>Affiliate-to-Affiliate Coupon Code</h2>
          <p>Share this code with anyone you&apos;d like to bring into the AIIT affiliate program -- they enter it when they apply.</p>
          <CopyBox value={data.affiliateCouponCode} />
          <p className="aff-card__footnote">{(data.affiliateReferralCount ?? 0).toLocaleString()} people have applied with your coupon code so far.</p>
        </section>
      ) : null}
    </div>
  );
}
