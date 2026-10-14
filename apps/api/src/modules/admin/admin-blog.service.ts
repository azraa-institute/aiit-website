import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminBlogPost,
  AdminBlogPostSummary,
  BlogMediaUploadResult,
  BlogPostStatus,
  BlogPublishResult,
  BlogVideoPresignResult,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SupabaseAdminService } from '../../common/supabase-admin/supabase-admin.service';
import { R2Service } from '../../common/r2/r2.service';
import { GithubPublisherService, GithubPublishError } from './github-publisher.service';
import type { BlogPostInputDto, ListBlogPostsQueryDto, PresignBlogVideoDto } from './dto/admin-blog.dto';

const POSTS_PATH = process.env.GITHUB_POSTS_PATH || 'apps/web/src/content/posts';
const BLOG_MEDIA_BUCKET = 'blog-media';

type BlogPostRow = Prisma.BlogPostGetPayload<Record<string, never>>;

/**
 * Admin-authored blog posts. This table is the authoring/workflow source of
 * truth (drafts, metadata, status) -- the live site still renders only from
 * apps/web/src/content/posts/*.md at build time (vite.config.ts's
 * buildPostsList()), untouched by this module. A row only becomes a real
 * post once publish() commits a matching file there; publishedAt/
 * lastCommitSha/filePath are only ever written after that commit is
 * confirmed, never optimistically -- see GithubPublisherService.
 */
@Injectable()
export class AdminBlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly supabase: SupabaseAdminService,
    private readonly r2: R2Service,
    private readonly github: GithubPublisherService,
  ) {}

  async list(query: ListBlogPostsQueryDto): Promise<AdminBlogPostSummary[]> {
    const where: Prisma.BlogPostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }] }
        : {}),
    };
    const posts = await this.prisma.blogPost.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return posts.map((p) => this.toSummary(p));
  }

  async get(id: string): Promise<AdminBlogPost> {
    const post = await this.findOrThrow(id);
    return this.toDetail(post);
  }

  /** Live uniqueness check against both the DB and whatever's actually committed on GitHub -- not just what this DB knows about. */
  async checkSlug(slug: string, excludeId?: string): Promise<{ available: boolean }> {
    const existing = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) return { available: false };
    if (this.github.isConfigured()) {
      const files = await this.github.listDir(POSTS_PATH);
      if (files.includes(`${slug}.md`)) return { available: false };
    }
    return { available: true };
  }

  async create(adminId: string, dto: BlogPostInputDto): Promise<AdminBlogPost> {
    const author = await this.prisma.profile.findUnique({ where: { id: adminId }, select: { name: true } });
    try {
      const post = await this.prisma.blogPost.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          category: dto.category,
          excerpt: dto.excerpt,
          bodyMarkdown: dto.bodyMarkdown,
          coverImageUrl: dto.coverImageUrl ?? null,
          coverImage2Url: dto.coverImage2Url ?? null,
          tags: dto.tags,
          readMinutes: dto.readMinutes ?? null,
          featured: dto.featured,
          preset: dto.preset,
          seoTitle: dto.seoTitle ?? null,
          seoDescription: dto.seoDescription ?? null,
          ogImageUrl: dto.ogImageUrl ?? null,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          status: 'draft',
          authorId: adminId,
          authorNameSnap: author?.name ?? null,
        },
      });
      await this.audit.record(adminId, 'blog.create', 'blog_post', post.id, { slug: post.slug });
      return this.toDetail(post);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('A post with that slug already exists.');
      }
      throw err;
    }
  }

  async update(adminId: string, id: string, dto: BlogPostInputDto): Promise<AdminBlogPost> {
    await this.findOrThrow(id);
    try {
      const post = await this.prisma.blogPost.update({
        where: { id },
        data: {
          slug: dto.slug,
          title: dto.title,
          category: dto.category,
          excerpt: dto.excerpt,
          bodyMarkdown: dto.bodyMarkdown,
          coverImageUrl: dto.coverImageUrl ?? null,
          coverImage2Url: dto.coverImage2Url ?? null,
          tags: dto.tags,
          readMinutes: dto.readMinutes ?? null,
          featured: dto.featured,
          preset: dto.preset,
          seoTitle: dto.seoTitle ?? null,
          seoDescription: dto.seoDescription ?? null,
          ogImageUrl: dto.ogImageUrl ?? null,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        },
      });
      await this.audit.record(adminId, 'blog.update', 'blog_post', id, { slug: post.slug });
      return this.toDetail(post);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('A post with that slug already exists.');
      }
      throw err;
    }
  }

  /** Only a never-published draft can be deleted outright -- a post that was ever live is archived via unpublish(), keeping its audit trail. */
  async deleteDraft(adminId: string, id: string): Promise<void> {
    const post = await this.findOrThrow(id);
    if (post.status !== 'draft') {
      throw new ConflictException('Only a draft that has never been published can be deleted -- unpublish it instead.');
    }
    await this.prisma.blogPost.delete({ where: { id } });
    await this.audit.record(adminId, 'blog.delete', 'blog_post', id, { slug: post.slug });
  }

  /**
   * Commits/updates the post's .md file in the live content folder. Never
   * writes status/publishedAt unless the commit itself succeeds -- a
   * thrown GithubPublishError leaves the row exactly as it was, and the
   * controller turns that into a structured 4xx the UI shows as a
   * persistent banner with a retry.
   */
  async publish(adminId: string, id: string): Promise<BlogPublishResult> {
    const existing = await this.findOrThrow(id);
    const author = await this.prisma.profile.findUnique({ where: { id: existing.authorId }, select: { name: true } });
    const filePath = `${POSTS_PATH}/${existing.slug}.md`;

    // Refresh the author-name snapshot at the moment of publishing (not on
    // every edit) -- same spirit as Certificate.holderName: accurate as of
    // the moment this became a real, public artifact.
    const authorName = author?.name ?? existing.authorNameSnap ?? 'AIIT Network';
    const content = buildMarkdownFile({ ...existing, authorNameSnap: authorName });

    // Fetch the file's current sha fresh right before writing (not whatever
    // this row remembers) -- dodges a stale-sha 409 if the repo moved on
    // without this row knowing, and also catches a same-slug file this DB
    // never created (e.g. hand-added to the repo).
    const currentSha = await this.github.getFileSha(filePath);
    if (currentSha && existing.filePath !== filePath && existing.status !== 'published') {
      throw new ConflictException(`A file already exists at ${filePath} that this post didn't create -- rename the slug.`);
    }

    const result = await this.github.putFile(
      filePath,
      Buffer.from(content, 'utf8'),
      `blog: ${existing.status === 'published' ? 'update' : 'publish'} "${existing.slug}"`,
      currentSha,
    );

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: existing.publishedAt ?? new Date(),
        authorNameSnap: authorName,
        lastCommitSha: result.commitSha,
        filePath,
      },
    });
    await this.audit.record(adminId, 'blog.publish', 'blog_post', id, { slug: existing.slug, commitSha: result.commitSha });
    return { post: this.toDetail(updated), commitUrl: result.commitUrl };
  }

  /** Deletes the live file (so the next build genuinely drops it) and only then archives the row. */
  async unpublish(adminId: string, id: string): Promise<AdminBlogPost> {
    const existing = await this.findOrThrow(id);
    if (!existing.filePath) {
      // Never actually published (or already unpublished) -- nothing live to remove, just reflect that in the row.
      const updated = await this.prisma.blogPost.update({ where: { id }, data: { status: 'archived' } });
      return this.toDetail(updated);
    }
    const sha = await this.github.getFileSha(existing.filePath);
    if (sha) {
      await this.github.deleteFile(existing.filePath, sha, `blog: unpublish "${existing.slug}"`);
    }
    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: { status: 'archived', filePath: null, lastCommitSha: null },
    });
    await this.audit.record(adminId, 'blog.unpublish', 'blog_post', id, { slug: existing.slug });
    return this.toDetail(updated);
  }

  /**
   * Cover images are hosted permanently in this public Storage bucket, not
   * committed into the repo -- the published frontmatter's `image:` field
   * holds this bucket's public URL directly. That's an already-supported
   * case, not a workaround: apps/web/src/lib/assetUrl.ts's own doc comment
   * says external URLs are returned unchanged (only local `/assets/...`
   * paths get the cache-busting version tag), and the <Plate> component
   * that renders a post's cover image accepts any image source.
   */
  async uploadCoverImage(file: Express.Multer.File): Promise<{ url: string }> {
    return { url: await this.uploadToPublicUrl(file, 'covers') };
  }

  /**
   * The editor's media library -- as many images/audio/video files as an
   * admin wants, each inserted into the body at the cursor (see
   * markdown.ts's `[audio: URL]`/`[video: URL]` shorthand for why those two
   * aren't just raw <audio>/<video> HTML). Same permanent-public-URL
   * approach as uploadCoverImage, not committed into the repo.
   */
  async uploadMedia(file: Express.Multer.File): Promise<BlogMediaUploadResult> {
    const kind = mediaKind(file.mimetype);
    const url = await this.uploadToPublicUrl(file, `media/${kind}`);
    return { url, kind };
  }

  /**
   * Video goes straight to R2 (direct browser -> R2 PUT), not through this
   * server -- unlike uploadMedia's image/audio path, which buffers through
   * Supabase Storage only because of a Supabase-specific RLS/JWT bug (see
   * SupabaseAdminService's doc comment) that R2 never had. Returns a
   * short-lived signed URL the editor PUTs the file to directly; this
   * method itself never sees the file bytes.
   */
  async presignVideoUpload(dto: PresignBlogVideoDto): Promise<BlogVideoPresignResult> {
    const key = this.r2.buildVideoKey(dto.filename);
    return this.r2.createPresignedUploadUrl(key, dto.contentType, dto.fileSize);
  }

  private async uploadToPublicUrl(file: Express.Multer.File, subdir: string): Promise<string> {
    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const key = `${subdir}/${randomUUID()}.${ext}`;
    await this.supabase.uploadToStorage(BLOG_MEDIA_BUCKET, key, file.buffer, file.mimetype);
    const base = process.env.SUPABASE_URL ?? '';
    return `${base}/storage/v1/object/public/${BLOG_MEDIA_BUCKET}/${key}`;
  }

  private async findOrThrow(id: string): Promise<BlogPostRow> {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found.');
    return post;
  }

  private toSummary(p: BlogPostRow): AdminBlogPostSummary {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      status: p.status as BlogPostStatus,
      featured: p.featured,
      authorId: p.authorId,
      authorName: p.authorNameSnap,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      lastCommitSha: p.lastCommitSha,
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toDetail(p: BlogPostRow): AdminBlogPost {
    return {
      ...this.toSummary(p),
      excerpt: p.excerpt,
      bodyMarkdown: p.bodyMarkdown,
      coverImageUrl: p.coverImageUrl,
      coverImage2Url: p.coverImage2Url,
      tags: p.tags,
      readMinutes: p.readMinutes,
      preset: p.preset as AdminBlogPost['preset'],
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      ogImageUrl: p.ogImageUrl,
      filePath: p.filePath,
      createdAt: p.createdAt.toISOString(),
    };
  }
}

/** Escapes a frontmatter scalar -- values here are always single-line (validated by BlogPostInputDto), so only the quote character itself needs handling. */
function scalar(v: string): string {
  return `"${v.replace(/"/g, "'")}"`;
}

function mediaKind(mimetype: string): BlogMediaUploadResult['kind'] {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  throw new BadRequestException("That file type isn't supported (allowed: images, audio, video).");
}

function buildMarkdownFile(post: BlogPostRow): string {
  const lines: string[] = [
    '---',
    `title: ${scalar(post.title)}`,
    `slug: ${post.slug}`,
    `category: ${scalar(post.category)}`,
    `publishedAt: ${(post.publishedAt ?? new Date()).toISOString().slice(0, 10)}`,
  ];
  if (post.coverImageUrl) lines.push(`image: ${post.coverImageUrl}`);
  if (post.coverImage2Url) lines.push(`image2: ${post.coverImage2Url}`);
  lines.push(`excerpt: ${scalar(post.excerpt)}`);
  if (post.readMinutes) lines.push(`readMinutes: ${post.readMinutes}`);
  lines.push(`featured: ${post.featured ? 'true' : 'false'}`);
  if (post.tags.length) lines.push(`tags: [${post.tags.map(scalar).join(', ')}]`);
  lines.push(`author: ${scalar(post.authorNameSnap || 'AIIT Network')}`);
  lines.push(`preset: ${post.preset}`);
  if (post.seoTitle) lines.push(`seoTitle: ${scalar(post.seoTitle)}`);
  if (post.seoDescription) lines.push(`seoDescription: ${scalar(post.seoDescription)}`);
  if (post.ogImageUrl) lines.push(`ogImage: ${post.ogImageUrl}`);
  lines.push('---', '', post.bodyMarkdown.trim(), '');
  return lines.join('\n');
}

export { GithubPublishError };
