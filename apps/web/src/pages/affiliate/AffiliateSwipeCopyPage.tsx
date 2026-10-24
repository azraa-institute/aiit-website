import { AFFILIATE_SWIPE_COPY } from '@/data/affiliateResources';
import { CopyButton } from '@/components/common/CopyButton';
import { AffiliateResourceGate } from './affiliateResourceGate';
import './affiliate-portal.css';

/** Renders the swipe-copy body text with the referral link as a real, clickable, underlined <a> instead of plain text, so it actually reads as a link. */
function BodyWithLink({ body, referralLink }: { body: string; referralLink: string }) {
  const index = body.indexOf(referralLink);
  if (index === -1) return <>{body}</>;
  return (
    <>
      {body.slice(0, index)}
      <a href={referralLink} target="_blank" rel="noopener noreferrer" className="aff-swipe-card__link">
        {referralLink}
      </a>
      {body.slice(index + referralLink.length)}
    </>
  );
}

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
                    <p className="aff-swipe-card__body">
                      <BodyWithLink body={body} referralLink={referralLink} />
                    </p>
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
