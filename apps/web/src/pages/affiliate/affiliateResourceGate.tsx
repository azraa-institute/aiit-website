import type { ReactNode } from 'react';
import { useAffiliateMe } from './affiliateData';

/**
 * Shared loading/error/locked gate for the three Resources sub-pages
 * (Talking points, Swipe copy, Banners) -- all three need the exact same
 * referralLink unlock check, so it lives here once instead of three times.
 */
export function AffiliateResourceGate({ lockedTitle, children }: { lockedTitle: string; children: (referralLink: string) => ReactNode }) {
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
  if (!data.referralLink) {
    return (
      <section className="aff-card">
        <h2>{lockedTitle}</h2>
        <p>
          This unlocks once your direct student referral link does (approved, activated, and your application includes the
          student or creator type). Head back to the Dashboard.
        </p>
      </section>
    );
  }

  return <>{children(data.referralLink)}</>;
}
