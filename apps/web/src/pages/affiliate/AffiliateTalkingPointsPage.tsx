import { AFFILIATE_TALKING_POINTS, type AffiliateTalkingPointIcon } from '@/data/affiliateResources';
import { ClassesIcon, CertificateIcon, CommunityIcon, FlexibleIcon, PricingIcon, SupportIcon } from './TalkingPointIcons';
import { AffiliateResourceGate } from './affiliateResourceGate';
import './affiliate-portal.css';

const ICONS: Record<AffiliateTalkingPointIcon, React.ComponentType<{ className?: string }>> = {
  classes: ClassesIcon,
  pricing: PricingIcon,
  flexible: FlexibleIcon,
  certificate: CertificateIcon,
  support: SupportIcon,
  community: CommunityIcon,
};

export default function AffiliateTalkingPointsPage() {
  return (
    <AffiliateResourceGate lockedTitle="Key talking points">
      {() => (
        <div className="aff-dash">
          <section className="aff-card aff-points-page">
            <p className="aff-eyebrow">Promote AIIT</p>
            <h2>Key talking points</h2>
            <p>Accurate, on-brand facts about AIIT: mention these when you talk or write about us, in your own words or theirs.</p>

            <div className="aff-points-grid">
              {AFFILIATE_TALKING_POINTS.map((point) => {
                const Icon = ICONS[point.icon];
                return (
                  <article key={point.id} className="aff-point-card">
                    <span className="aff-point-card__icon">
                      <Icon />
                    </span>
                    <div>
                      <h3 className="aff-point-card__title">{point.title}</h3>
                      <p className="aff-point-card__body">{point.body}</p>
                    </div>
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
