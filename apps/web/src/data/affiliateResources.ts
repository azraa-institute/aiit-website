/**
 * Ready-made promotional images for affiliates to embed on their own
 * blogs/sites. Each "style" is a folder of PNGs under
 * public/assets/affiliate/resources/<style.folder>/<sizeId>.png, all sharing
 * the same set of standard IAB ad sizes (AFFILIATE_RESOURCE_SIZES below) so a
 * new style is just a new folder of same-named files plus one registry
 * entry -- no code changes needed beyond that.
 *
 * Deliberately named "resources", not "banners", throughout this feature
 * (routes, CSS classes, file/asset paths) -- ad-blocker filter lists
 * routinely block any URL/class containing "banner", which silently broke
 * the images on a real affiliate's machine the first time this shipped.
 */

export interface AffiliateResourceSize {
  id: string;
  width: number;
  height: number;
  label: string;
  category: 'Leaderboard' | 'Rectangle' | 'Skyscraper' | 'Mobile';
}

export interface AffiliateResourceStyle {
  id: string;
  name: string;
  description: string;
  /** Folder under /assets/affiliate/resources -- files inside are named `${sizeId}.png`. */
  folder: string;
  /** Which of AFFILIATE_RESOURCE_SIZES this style has artwork for. */
  sizeIds: string[];
}

export const AFFILIATE_RESOURCE_SIZES: AffiliateResourceSize[] = [
  { id: '970x250', width: 970, height: 250, label: 'Billboard', category: 'Leaderboard' },
  { id: '970x90', width: 970, height: 90, label: 'Super Leaderboard', category: 'Leaderboard' },
  { id: '728x90', width: 728, height: 90, label: 'Leaderboard', category: 'Leaderboard' },
  { id: '336x280', width: 336, height: 280, label: 'Large Rectangle', category: 'Rectangle' },
  { id: '300x250', width: 300, height: 250, label: 'Medium Rectangle', category: 'Rectangle' },
  { id: '300x600', width: 300, height: 600, label: 'Half Page', category: 'Skyscraper' },
  { id: '160x600', width: 160, height: 600, label: 'Wide Skyscraper', category: 'Skyscraper' },
  { id: '320x100', width: 320, height: 100, label: 'Large Mobile Banner', category: 'Mobile' },
  { id: '320x50', width: 320, height: 50, label: 'Mobile Banner', category: 'Mobile' },
];

export const AFFILIATE_RESOURCE_STYLES: AffiliateResourceStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The original AIIT Network image set, in every standard size.',
    folder: 'classic',
    sizeIds: AFFILIATE_RESOURCE_SIZES.map((size) => size.id),
  },
];

export function resourceImagePath(style: AffiliateResourceStyle, size: AffiliateResourceSize): string {
  return `/assets/affiliate/resources/${style.folder}/${size.id}.png`;
}

/** The exact snippet an affiliate pastes into their own site -- their referral link is already baked in, nothing to replace by hand. */
export function resourceHtmlSnippet(style: AffiliateResourceStyle, size: AffiliateResourceSize, referralLink: string): string {
  const src = `${window.location.origin}${resourceImagePath(style, size)}`;
  return `<a href="${referralLink}" target="_blank" rel="noopener sponsored">\n  <img src="${src}" alt="AIIT Network - Build Your Global Tech Career" width="${size.width}" height="${size.height}" style="border:0;">\n</a>`;
}
