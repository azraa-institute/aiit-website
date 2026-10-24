import { AFFILIATE_TALKING_POINTS } from '@/data/affiliateResources';
import { CheckIcon } from '@/components/common/CopyButton';
import { AffiliateResourceGate } from './affiliateResourceGate';
import './affiliate-portal.css';

export default function AffiliateTalkingPointsPage() {
  return (
    <AffiliateResourceGate lockedTitle="Key talking points">
      {() => (
        <div className="aff-dash">
          <section className="aff-card">
            <p className="aff-eyebrow">Promote AIIT</p>
            <h2>Key talking points</h2>
            <p>Accurate, on-brand facts about AIIT — mention these when you talk or write about us, in your own words or theirs.</p>
            <ul className="aff-points">
              {AFFILIATE_TALKING_POINTS.map((point) => (
                <li key={point}>
                  <CheckIcon className="aff-points__icon" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AffiliateResourceGate>
  );
}
