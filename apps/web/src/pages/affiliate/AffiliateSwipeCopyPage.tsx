import { AFFILIATE_SWIPE_COPY } from '@/data/affiliateResources';
import { CopyButton } from '@/components/common/CopyButton';
import { AffiliateResourceGate } from './affiliateResourceGate';
import './affiliate-portal.css';

export default function AffiliateSwipeCopyPage() {
  return (
    <AffiliateResourceGate lockedTitle="Email &amp; social copy">
      {(referralLink) => (
        <div className="aff-dash">
          <section className="aff-card">
            <p className="aff-eyebrow">Promote AIIT</p>
            <h2>Email &amp; social copy</h2>
            <p>Ready-to-paste swipe copy for an email, a post, or a quick DM: your referral link is already in every one.</p>
            <div className="aff-swipe-grid">
              {AFFILIATE_SWIPE_COPY.map((item) => {
                const body = item.body(referralLink);
                const value = item.subject ? `Subject: ${item.subject}\n\n${body}` : body;
                return (
                  <article key={item.id} className="aff-swipe-card">
                    <p className="aff-swipe-card__kicker">{item.kicker}</p>
                    {item.subject ? <p className="aff-swipe-card__subject">Subject: {item.subject}</p> : null}
                    <p className="aff-swipe-card__body">{body}</p>
                    <CopyButton value={value} label="Copy" copiedLabel="Copied" className="aff-swipe-card__copy" />
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </AffiliateResourceGate>
  );
}
