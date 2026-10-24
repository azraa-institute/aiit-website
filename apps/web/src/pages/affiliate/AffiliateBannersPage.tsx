import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { CopyButton } from '@/components/common/CopyButton';
import {
  AFFILIATE_BANNER_SIZES,
  AFFILIATE_BANNER_STYLES,
  bannerHtmlSnippet,
  bannerImagePath,
  type AffiliateBannerSize,
} from '@/data/affiliateBanners';
import { useAffiliateMe } from './affiliateData';
import './affiliate-portal.css';

const SIZE_FILTERS: Array<{ id: 'all' | AffiliateBannerSize['category']; label: string }> = [
  { id: 'all', label: 'All sizes' },
  { id: 'Leaderboard', label: 'Leaderboards' },
  { id: 'Rectangle', label: 'Rectangles' },
  { id: 'Skyscraper', label: 'Skyscrapers' },
  { id: 'Mobile', label: 'Mobile' },
];

export default function AffiliateBannersPage() {
  const state = useAffiliateMe();
  const [styleId, setStyleId] = useState(AFFILIATE_BANNER_STYLES[0].id);
  const [category, setCategory] = useState<'all' | AffiliateBannerSize['category']>('all');

  const style = AFFILIATE_BANNER_STYLES.find((s) => s.id === styleId) ?? AFFILIATE_BANNER_STYLES[0];
  const sizes = useMemo(
    () => AFFILIATE_BANNER_SIZES.filter((size) => style.sizeIds.includes(size.id) && (category === 'all' || size.category === category)),
    [style, category],
  );

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
        <h2>Promotional banners</h2>
        <p>
          Banners link out to AIIT with your own referral link baked in, so they unlock once your direct student referral link does
          (approved, activated, and your application includes the student or creator type). Head back to the Dashboard.
        </p>
      </section>
    );
  }

  const referralLink = data.referralLink;

  return (
    <div className="aff-dash">
      <section className="aff-card">
        <h2>Promotional banners</h2>
        <p>
          Every banner below already has your referral link baked into its code. Copy the HTML for the size you want and paste it
          straight onto your blog or site — nothing to edit by hand.
        </p>

        {AFFILIATE_BANNER_STYLES.length > 1 ? (
          <div className="aff-banners__filters" role="group" aria-label="Banner style">
            {AFFILIATE_BANNER_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cn('chip', styleId === s.id && 'chip--active')}
                aria-pressed={styleId === s.id}
                onClick={() => setStyleId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="aff-banners__filters" role="group" aria-label="Banner size">
          {SIZE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cn('chip', category === f.id && 'chip--active')}
              aria-pressed={category === f.id}
              onClick={() => setCategory(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <div className="aff-banner-grid">
        {sizes.map((size) => (
          <article key={size.id} className="aff-banner-card">
            <div className="aff-banner-card__preview">
              <img src={bannerImagePath(style, size)} alt={`${size.label} (${size.width}×${size.height}) banner preview`} loading="lazy" />
            </div>
            <div className="aff-banner-card__meta">
              <p className="aff-banner-card__size">
                {size.width} × {size.height}
              </p>
              <p className="aff-banner-card__label">{size.label}</p>
            </div>
            <CopyButton
              value={bannerHtmlSnippet(style, size, referralLink)}
              label="Copy HTML code"
              copiedLabel="Code copied"
              className="aff-banner-card__copy"
            />
          </article>
        ))}
      </div>
    </div>
  );
}
