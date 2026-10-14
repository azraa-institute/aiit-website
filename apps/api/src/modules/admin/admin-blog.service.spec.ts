import { ConflictException } from '@nestjs/common';
import { AdminBlogService } from './admin-blog.service';
import { GithubPublishError } from './github-publisher.service';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const POST_ID = '22222222-2222-4222-8222-222222222222';

describe('AdminBlogService', () => {
  let service: AdminBlogService;
  let prisma: {
    blogPost: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    profile: { findUnique: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let supabase: { uploadToStorage: jest.Mock };
  let r2: { buildVideoKey: jest.Mock; createPresignedUploadUrl: jest.Mock };
  let github: { isConfigured: jest.Mock; getFileSha: jest.Mock; listDir: jest.Mock; putFile: jest.Mock; deleteFile: jest.Mock };

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: POST_ID,
    slug: 'a-post',
    title: 'A Post',
    category: 'Tech Explainers',
    excerpt: 'An excerpt long enough to pass validation.',
    bodyMarkdown: '<p>Body</p>',
    coverImageUrl: null,
    coverImage2Url: null,
    tags: ['AI'],
    readMinutes: 5,
    featured: false,
    preset: 'editorial',
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
    status: 'draft',
    authorId: ADMIN,
    authorNameSnap: 'Ada',
    scheduledAt: null,
    publishedAt: null,
    lastCommitSha: null,
    filePath: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      blogPost: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      profile: { findUnique: jest.fn().mockResolvedValue({ name: 'Ada' }) },
    };
    audit = { record: jest.fn() };
    supabase = { uploadToStorage: jest.fn() };
    r2 = {
      buildVideoKey: jest.fn().mockReturnValue('media/video/fake-uuid.mp4'),
      createPresignedUploadUrl: jest.fn().mockResolvedValue({ uploadUrl: 'https://r2.example/signed', publicUrl: 'https://media.example/media/video/fake-uuid.mp4' }),
    };
    github = {
      isConfigured: jest.fn().mockReturnValue(true),
      getFileSha: jest.fn().mockResolvedValue(null),
      listDir: jest.fn().mockResolvedValue([]),
      putFile: jest.fn().mockResolvedValue({ fileSha: 'file-sha', commitSha: 'commit-sha', commitUrl: 'https://github.com/x/commit/1' }),
      deleteFile: jest.fn(),
    };
    service = new AdminBlogService(prisma as never, audit as never, supabase as never, r2 as never, github as never);
  });

  it('create() rejects a duplicate slug with a 409, not a raw Prisma error', async () => {
    prisma.blogPost.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002', name: 'PrismaClientKnownRequestError' }));
    await expect(
      service.create(ADMIN, {
        slug: 'a-post',
        title: 'A Post',
        category: 'Tech',
        excerpt: 'x'.repeat(20),
        bodyMarkdown: 'body',
        tags: [],
        featured: false,
        preset: 'editorial',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('publish() commits the file, then marks the row published with the real commit sha', async () => {
    prisma.blogPost.findUnique.mockResolvedValue(row());
    prisma.blogPost.update.mockResolvedValue(row({ status: 'published', lastCommitSha: 'commit-sha', filePath: 'apps/web/src/content/posts/a-post.md' }));

    const result = await service.publish(ADMIN, POST_ID);

    expect(github.putFile).toHaveBeenCalledWith(
      'apps/web/src/content/posts/a-post.md',
      expect.any(Buffer),
      expect.stringContaining('publish'),
      null,
    );
    expect(prisma.blogPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'published', lastCommitSha: 'commit-sha' }) }),
    );
    expect(result.commitUrl).toBe('https://github.com/x/commit/1');
    expect(audit.record).toHaveBeenCalledWith(ADMIN, 'blog.publish', 'blog_post', POST_ID, expect.objectContaining({ commitSha: 'commit-sha' }));
  });

  it('publish() leaves the row untouched when the GitHub commit fails', async () => {
    prisma.blogPost.findUnique.mockResolvedValue(row());
    github.putFile.mockRejectedValue(new GithubPublishError('rate_limited', 'slow down', true));

    await expect(service.publish(ADMIN, POST_ID)).rejects.toBeInstanceOf(GithubPublishError);
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('unpublish() deletes the live file before archiving the row', async () => {
    prisma.blogPost.findUnique.mockResolvedValue(
      row({ status: 'published', filePath: 'apps/web/src/content/posts/a-post.md', lastCommitSha: 'commit-sha' }),
    );
    github.getFileSha.mockResolvedValue('file-sha');
    prisma.blogPost.update.mockResolvedValue(row({ status: 'archived', filePath: null, lastCommitSha: null }));

    await service.unpublish(ADMIN, POST_ID);

    expect(github.deleteFile).toHaveBeenCalledWith('apps/web/src/content/posts/a-post.md', 'file-sha', expect.stringContaining('unpublish'));
    expect(prisma.blogPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'archived', filePath: null }) }),
    );
  });

  it('deleteDraft() refuses to delete a post that was ever published', async () => {
    prisma.blogPost.findUnique.mockResolvedValue(row({ status: 'archived' }));
    await expect(service.deleteDraft(ADMIN, POST_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.blogPost.delete).not.toHaveBeenCalled();
  });

  it('checkSlug() flags a slug already live on GitHub even if the DB has never heard of it', async () => {
    prisma.blogPost.findUnique.mockResolvedValue(null);
    github.listDir.mockResolvedValue(['a-post.md']);
    await expect(service.checkSlug('a-post')).resolves.toEqual({ available: false });
  });

  describe('uploadMedia', () => {
    const file = (mimetype: string) => ({ originalname: 'clip.bin', mimetype, buffer: Buffer.from('x') }) as Express.Multer.File;

    it('detects kind from mimetype and uploads under a kind-named subdir', async () => {
      const result = await service.uploadMedia(file('video/mp4'));
      expect(result.kind).toBe('video');
      expect(supabase.uploadToStorage).toHaveBeenCalledWith('blog-media', expect.stringMatching(/^media\/video\//), expect.any(Buffer), 'video/mp4');
      expect(result.url).toContain('blog-media');
    });

    it('rejects a mimetype outside image/audio/video', async () => {
      await expect(service.uploadMedia(file('application/pdf'))).rejects.toThrow();
    });
  });

  describe('presignVideoUpload', () => {
    it('builds an R2 key from the filename and signs a PUT URL for it', async () => {
      const result = await service.presignVideoUpload({ filename: 'lecture.mp4', contentType: 'video/mp4', fileSize: 1024 } as never);
      expect(r2.buildVideoKey).toHaveBeenCalledWith('lecture.mp4');
      expect(r2.createPresignedUploadUrl).toHaveBeenCalledWith('media/video/fake-uuid.mp4', 'video/mp4', 1024);
      expect(result).toEqual({ uploadUrl: 'https://r2.example/signed', publicUrl: 'https://media.example/media/video/fake-uuid.mp4' });
    });
  });
});
