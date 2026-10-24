/**
 * Ready-made promotional banners for affiliates to embed on their own
 * blogs/sites. Each "style" is a folder of PNGs under
 * public/assets/affiliate/banners/<style.basePath>/<sizeId>.png, all sharing
 * the same set of standard IAB ad sizes (AFFILIATE_BANNER_SIZES below) so a
 * new style is just a new folder of same-named files plus one registry
 * entry -- no code changes needed beyond that.
 */

export interface AffiliateBannerSize {
  id: string;
  width: number;
  height: number;
  label: string;
  category: 'Leaderboard' | 'Rectangle' | 'Skyscraper' | 'Mobile';
}

export interface AffiliateBannerStyle {
  id: string;
  name: string;
  description: string;
  /** Folder under /assets/affiliate/banners -- files inside are named `${sizeId}.png`. */
  folder: string;
  /** Which of AFFILIATE_BANNER_SIZES this style has artwork for. */
  sizeIds: string[];
}

export const AFFILIATE_BANNER_SIZES: AffiliateBannerSize[] = [
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

export const AFFILIATE_BANNER_STYLES: AffiliateBannerStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The original AIIT Network banner set, in every standard size.',
    folder: 'classic',
    sizeIds: AFFILIATE_BANNER_SIZES.map((size) => size.id),
  },
];

export function bannerImagePath(style: AffiliateBannerStyle, size: AffiliateBannerSize): string {
  return `/assets/affiliate/banners/${style.folder}/${size.id}.png`;
}

/** The exact snippet an affiliate pastes into their own site -- their referral link is already baked in, nothing to replace by hand. */
export function bannerHtmlSnippet(style: AffiliateBannerStyle, size: AffiliateBannerSize, referralLink: string): string {
  const src = `${window.location.origin}${bannerImagePath(style, size)}`;
  return `<a href="${referralLink}" target="_blank" rel="noopener sponsored">\n  <img src="${src}" alt="AIIT Network - Build Your Global Tech Career" width="${size.width}" height="${size.height}" style="border:0;">\n</a>`;
}
