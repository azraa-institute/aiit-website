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

export default function AffiliateLinkPage() {
  const state = useAffiliateMe();
  const [copied, setCopied] = useState(false);

  if (state.status === 'loading') return <p className="aff-loading">Loading…</p>;
  if (state.status === 'error') {
    return (
      <p className="aff-error" role="alert">
        {state.error.message}
      </p>
    );
  }

  const { data } = state;
  if (!data.referralLink) {
    return (
      <section className="aff-card">
        <h2>Your referral link</h2>
        <p>Your referral link unlocks once your application is approved and activated -- head back to the Dashboard.</p>
      </section>
    );
  }

  async function copyLink() {
    if (!data.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable, the link is still shown as selectable text */
    }
  }

  return (
    <div className="aff-dash">
      <section className="aff-card">
        <h2>Your referral link</h2>
        <p>Share this instead of a code, anyone who signs up after clicking it is attributed to you automatically.</p>
        <div className="aff-linkbox">
          <code>{data.referralLink}</code>
          <button type="button" className={cn('aff-linkbox__copy', copied && 'is-copied')} onClick={copyLink}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="aff-card__footnote">{(data.registrationCount ?? 0).toLocaleString()} people have registered via this link so far.</p>
      </section>
    </div>
  );
}
