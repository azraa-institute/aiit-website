/**
 * Static files under `public/assets/*` keep stable filenames, so replacing a
 * file in place (e.g. refreshing a blog image) is invisible to any browser
 * that already cached the old bytes — especially where an earlier
 * `Cache-Control: immutable` header told it never to revalidate.
 *
 * `assetUrl()` appends a version tag to local `/assets/...` URLs so a content
 * swap forces one clean re-fetch. Ongoing revalidation is handled by the
 * cache headers in `vercel.json`; this tag only exists to flush caches that
 * were poisoned by the previous `immutable` policy.
 *
 * Bump `ASSET_VERSION` whenever a file in `public/assets/` is replaced under
 * its existing name.
 */
export const ASSET_VERSION = '2';

/** Append the asset version to a local `/assets/...` URL. External URLs and
 *  data/blob URIs are returned unchanged. */
export function assetUrl(src: string): string {
  if (!src.startsWith('/assets/')) return src;
  return `${src}${src.includes('?') ? '&' : '?'}v=${ASSET_VERSION}`;
}
