/// <reference types="vite/client" />

declare module 'virtual:aiit-blog' {
  import type { Resource } from '@/data/types';
  /** Blog post frontmatter (no body), newest-first — see vite.config.ts. */
  export const posts: Resource[];
}
