import type { Resource } from './types';
import { posts } from 'virtual:aiit-blog';

/**
 * AIIT Resources — the blog.
 *
 * One file per post in `src/content/posts/*.md`: YAML-ish frontmatter plus a
 * Markdown (or pasted-HTML) body. That folder is the ONLY source of truth —
 * adding or editing a post is a file change, nothing here.
 *
 * The `virtual:aiit-blog` module (vite.config.ts) parses the frontmatter at
 * build time into this lightweight list. Article BODIES are code-split per
 * post and fetched on demand with `loadResourceBody()`, so the post list stays
 * cheap on the homepage and in global search and full text only loads when
 * someone opens an article.
 *
 * Frontmatter keys:
 *   title, slug, category, publishedAt, image, excerpt   (required)
 *   featured   (bool, default false)
 *   tags       (["a","b"] inline array, default [])
 *   author     (default "AIIT Network")
 *   readMinutes (number; default = estimated from the body)
 *   source     (original URL; optional)
 */

export const RESOURCES: Resource[] = posts;

export function getResource(slug: string): Resource | undefined {
  return RESOURCES.find((r) => r.slug === slug);
}

const bodyLoaders = import.meta.glob('../content/posts/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const bodyCache = new Map<string, Promise<string>>();

/** Load one post's body (frontmatter stripped). Cached per slug. */
export function loadResourceBody(slug: string): Promise<string> {
  const cached = bodyCache.get(slug);
  if (cached) return cached;

  const entry = Object.entries(bodyLoaders).find(([p]) => p.endsWith(`/${slug}.md`));
  const promise: Promise<string> = entry
    ? entry[1]().then((raw) =>
        raw.replace(/^\uFEFF/, '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim(),
      )
    : Promise.resolve('');

  bodyCache.set(slug, promise);
  return promise;
}
