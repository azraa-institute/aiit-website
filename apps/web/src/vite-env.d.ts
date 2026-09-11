/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'virtual:aiit-blog' {
  import type { Resource } from '@/data/types';
  /** Blog post frontmatter (no body), newest-first — see vite.config.ts. */
  export const posts: Resource[];
}
