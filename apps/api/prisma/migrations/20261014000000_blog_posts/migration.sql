-- Admin-authored blog posts. This table is the authoring/workflow source of
-- truth (drafts, metadata, status); the live site still renders only from
-- apps/web/src/content/posts/*.md -- a row only becomes a real post once the
-- Publish action commits a matching file to that folder.

CREATE TYPE "BlogPostStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');

CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "cover_image2_url" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "read_minutes" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "preset" TEXT NOT NULL DEFAULT 'editorial',
    "seo_title" TEXT,
    "seo_description" TEXT,
    "og_image_url" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'draft',
    "author_id" UUID NOT NULL,
    "author_name_snap" TEXT,
    "scheduled_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "last_commit_sha" TEXT,
    "file_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_status_updated_at_idx" ON "blog_posts"("status", "updated_at");
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts"("author_id");

-- RLS: defense-in-depth; the API (service role) does the real enforcement,
-- same convention as audit_logs.
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_admin_all" ON "blog_posts"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
