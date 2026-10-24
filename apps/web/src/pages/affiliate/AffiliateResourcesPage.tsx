import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { CopyButton } from '@/components/common/CopyButton';
import {
  AFFILIATE_RESOURCE_SIZES,
  AFFILIATE_RESOURCE_STYLES,
  resourceHtmlSnippet,
  resourceImagePath,
  type AffiliateResourceSize,
  type AffiliateResourceStyle,
} from '@/data/affiliateResources';
import { useAffiliateMe } from './affiliateData';
import './affiliate-portal.css';

const SIZE_FILTERS: Array<{ id: 'all' | AffiliateResourceSize['category']; label: string }> = [
  { id: 'all', label: 'All sizes' },
  { id: 'Leaderboard', label: 'Leaderboards' },
  { id: 'Rectangle', label: 'Rectangles' },
  { id: 'Skyscraper', label: 'Skyscrapers' },
  { id: 'Mobile', label: 'Mobile' },
];

/**
 * A preview image with a visible fallback on load failure, instead of
 * silently leaving the checkerboard placeholder blank -- a browser
 * extension (ad-blocker/privacy) blocking the request client-side, or a
 * transient network blip, both look identical to the affiliate otherwise.
 * "Retry" re-points the src with a cache-busting query param so a transient
 * failure isn't stuck forever. The Copy HTML code button works regardless
 * of whether this preview ever loads.
 */
function ResourcePreview({ style, size }: { style: AffiliateResourceStyle; size: AffiliateResourceSize }) {
  const basePath = resourceImagePath(style, size);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="aff-resource-card__fallback">
        <p>Preview didn&apos;t load — your browser may be blocking it. The code below still works.</p>
        <button
          type="button"
          className="aff-resource-card__retry"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <img
      key={attempt}
      src={attempt === 0 ? basePath : `${basePath}?retry=${attempt}`}
      alt={`${size.label} (${size.width}×${size.height}) preview`}
      onError={() => setFailed(true)}
    />
  );
}

export default function AffiliateResourcesPage() {
  const state = useAffiliateMe();
  const [styleId, setStyleId] = useState(AFFILIATE_RESOURCE_STYLES[0].id);
  const [category, setCategory] = useState<'all' | AffiliateResourceSize['category']>('all');

  const style = AFFILIATE_RESOURCE_STYLES.find((s) => s.id === styleId) ?? AFFILIATE_RESOURCE_STYLES[0];
  const sizes = useMemo(
    () => AFFILIATE_RESOURCE_SIZES.filter((size) => style.sizeIds.includes(size.id) && (category === 'all' || size.category === category)),
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
        <h2>Affiliate resources</h2>
        <p>
          These link out to AIIT with your own referral link baked in, so they unlock once your direct student referral link does
          (approved, activated, and your application includes the student or creator type). Head back to the Dashboard.
        </p>
      </section>
    );
  }

  const referralLink = data.referralLink;

  return (
    <div className="aff-dash">
      <section className="aff-card">
        <h2>Affiliate resources</h2>
        <p>
          Every image below already has your referral link baked into its code. Copy the HTML for the size you want and paste it
          straight onto your blog or site — nothing to edit by hand.
        </p>

        {AFFILIATE_RESOURCE_STYLES.length > 1 ? (
          <div className="aff-resources__filters" role="group" aria-label="Style">
            {AFFILIATE_RESOURCE_STYLES.map((s) => (
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

        <div className="aff-resources__filters" role="group" aria-label="Size">
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

      <div className="aff-resource-grid">
        {sizes.map((size) => (
          <article key={size.id} className="aff-resource-card">
            <div className="aff-resource-card__preview">
              <ResourcePreview style={style} size={size} />
            </div>
            <div className="aff-resource-card__meta">
              <p className="aff-resource-card__size">
                {size.width} × {size.height}
              </p>
              <p className="aff-resource-card__label">{size.label}</p>
            </div>
            <CopyButton
              value={resourceHtmlSnippet(style, size, referralLink)}
              label="Copy HTML code"
              copiedLabel="Code copied"
              className="aff-resource-card__copy"
            />
          </article>
        ))}
      </div>
    </div>
  );
}
