/**
 * Admin-authored blog posts, published to the GitHub content folder
 * (apps/web/src/content/posts/*.md) -- see apps/api/src/modules/admin/
 * admin-blog.* and admin/github-publisher.service.ts.
 *
 * The DB row (BlogPost in schema.prisma) is the authoring/workflow source of
 * truth; it is NOT what the public site renders from. Only the Publish
 * action commits a matching .md file, and that's the only thing the live
 * frontend's build-time ingestion (vite.config.ts's buildPostsList()) ever
 * sees. status/publishedAt here describe the admin's workflow state, not
 * necessarily what's live if a publish failed partway.
 *
 * This package is type-only (see index.ts) -- the literal preset list
 * below is NOT exported as a runtime value here. Both apps/api's
 * admin-blog DTO and apps/web's preset dropdown keep their own runtime
 * array `satisfies BlogLayoutPreset[]`, so adding/removing a preset is a
 * compile error in both places until every copy is updated.
 */

export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

/** An engineer-authored CSS modifier (resource-detail.css) -- never free-form/admin CSS. */
export type BlogLayoutPreset = 'editorial' | 'tutorial' | 'news-brief' | 'spotlight' | 'data-deep-dive';

export interface AdminBlogPostSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: BlogPostStatus;
  featured: boolean;
  authorId: string;
  authorName: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  lastCommitSha: string | null;
  updatedAt: string;
}

export interface AdminBlogPost extends AdminBlogPostSummary {
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string | null;
  coverImage2Url: string | null;
  tags: string[];
  readMinutes: number | null;
  preset: BlogLayoutPreset;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  filePath: string | null;
  createdAt: string;
}

/** POST/PUT body for creating or updating a draft -- publish/unpublish are separate actions. */
export interface BlogPostInput {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl?: string | null;
  coverImage2Url?: string | null;
  tags: string[];
  readMinutes?: number | null;
  featured: boolean;
  preset: BlogLayoutPreset;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  scheduledAt?: string | null;
}

export interface BlogPublishResult {
  post: AdminBlogPost;
  commitUrl: string;
}

/** Structured publish/unpublish failure -- the UI shows this as a persistent banner, never a silent toast. */
export interface BlogPublishError {
  code: 'validation' | 'auth' | 'conflict' | 'rate_limited' | 'network' | 'unknown';
  message: string;
  retryable: boolean;
}
