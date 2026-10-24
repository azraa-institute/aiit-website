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

/** Short, factual context per IAB size category -- helps an affiliate pick the right one for where they're actually posting, instead of guessing from pixel dimensions alone. */
export const RESOURCE_CATEGORY_CONTEXT: Record<AffiliateResourceSize['category'], string> = {
  Leaderboard: 'Best for a blog header, footer, or between articles',
  Rectangle: 'Best for in-content placements and sidebars',
  Skyscraper: 'Best for a tall sidebar slot',
  Mobile: 'Best for mobile-responsive placements',
};

/** Which TalkingPointIcons.tsx component a point renders -- a string key, not the component itself, so this stays plain data. */
export type AffiliateTalkingPointIcon = 'classes' | 'pricing' | 'flexible' | 'certificate' | 'support' | 'community';

export interface AffiliateTalkingPoint {
  id: string;
  icon: AffiliateTalkingPointIcon;
  title: string;
  body: string;
}

/**
 * Accurate, source-grounded talking points -- every claim here matches copy
 * already published elsewhere on the site (apps/web/src/data/ecosystem.ts's
 * WHY_JOIN_REASONS/HOW_IT_WORKS), so an affiliate repeating these stays
 * consistent with AIIT's own marketing rather than improvising. No numbers
 * (student counts, etc.) are invented here that aren't already public.
 */
export const AFFILIATE_TALKING_POINTS: AffiliateTalkingPoint[] = [
  {
    id: 'classes',
    icon: 'classes',
    title: 'Live, instructor-led classes',
    body: 'AIIT offers live, instructor-led classes, not pre-recorded videos, in AI Engineering, Data Science & Analytics, Generative AI & LLMs, Cybersecurity, Cloud Computing, Edge Computing & Blockchain, and Cisco CCNA.',
  },
  {
    id: 'pricing',
    icon: 'pricing',
    title: 'Affordable and accessible',
    body: 'Most programmes are priced between $128 and $250, genuinely accessible for students and professionals across Africa and Asia.',
  },
  {
    id: 'flexible',
    icon: 'flexible',
    title: 'Learn from anywhere',
    body: 'Learn on a PC or mobile, at your own pace or through a structured schedule, from anywhere in the world.',
  },
  {
    id: 'certificate',
    icon: 'certificate',
    title: 'Verifiable AIIT Certificate',
    body: 'Every graduate earns a verifiable AIIT Certificate; select programmes also prepare learners for industry-recognised certifications like Cisco CCNA.',
  },
  {
    id: 'support',
    icon: 'support',
    title: 'Ongoing support',
    body: "Support doesn't stop at the certificate: internship facilitation (including the UK and other destinations, best-efforts basis), scholarship and higher-education guidance, and ongoing career guidance.",
  },
  {
    id: 'community',
    icon: 'community',
    title: 'A global learner community',
    body: 'A real, global learner community, not a solo video course.',
  },
];

export interface AffiliateSwipeCopy {
  id: string;
  kicker: string;
  subject?: string;
  body: (referralLink: string) => string;
}

/** Ready-to-paste email/social copy with the referral link already filled in -- the affiliate never has to draft their own pitch from scratch. */
export const AFFILIATE_SWIPE_COPY: AffiliateSwipeCopy[] = [
  {
    id: 'email',
    kicker: 'Email',
    subject: 'Build a global tech career, without the price tag',
    body: (referralLink) =>
      `Hi [Name],\n\nI wanted to share something that could be genuinely useful for you. AIIT (Azraa Institute of Information Technology) runs live, instructor-led courses in AI Engineering, Data Science, Generative AI & LLMs, Cybersecurity, Cloud Computing and Cisco CCNA, most priced between $128 and $250.\n\nYou get a verifiable AIIT Certificate on completion, the flexibility to learn on your phone or PC, and support with internships and further study afterward.\n\nTake a look here: ${referralLink}\n\n[Your name]`,
  },
  {
    id: 'social',
    kicker: 'Social post',
    body: (referralLink) =>
      `Thinking about a career in tech? AIIT runs live, project-based courses in AI, Data Science, Cybersecurity, Cloud Computing and more, most under $250, with a real certificate at the end. Check it out: ${referralLink}`,
  },
  {
    id: 'dm',
    kicker: 'Quick DM / WhatsApp',
    body: (referralLink) =>
      `Hey! Thought you'd like this: live, affordable tech courses (AI, Data Science, Cybersecurity, Cloud & more) with a real certificate at the end. ${referralLink}`,
  },
];
