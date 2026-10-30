import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { AdminBlogPost, AdminBlogPostSummary, BlogMediaUploadResult, BlogPublishResult, BlogVideoPresignResult } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminBlogService } from './admin-blog.service';
import { GithubPublishError } from './github-publisher.service';
import { BlogPostInputDto, ListBlogPostsQueryDto, PresignBlogVideoDto } from './dto/admin-blog.dto';

const COVER_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const COVER_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * One flat ceiling covering image/audio -- multer's FileInterceptor can't
 * apply a per-mimetype limit before it's even read the file, so
 * kind-specific checks happen in AdminBlogService.uploadMedia after the
 * fact. The Supabase bucket's own file_size_limit (dashboard config, not
 * visible from here) is the real backstop if this is ever raised past what
 * it allows. Video does NOT go through this endpoint -- see
 * presignVideoUpload below, a direct-to-R2 upload that never buffers the
 * file in this server's memory.
 */
const MEDIA_MAX_BYTES = 80 * 1024 * 1024;
const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

const GITHUB_ERROR_STATUS: Record<GithubPublishError['code'], number> = {
  auth: 502,
  conflict: 409,
  rate_limited: 429,
  network: 503,
  unknown: 502,
};

@Controller('admin/blog')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminBlogController {
  constructor(private readonly blog: AdminBlogService) {}

  @Get()
  list(@Query() query: ListBlogPostsQueryDto): Promise<AdminBlogPostSummary[]> {
    return this.blog.list(query);
  }

  @Get('check-slug')
  checkSlug(@Query('slug') slug: string, @Query('excludeId') excludeId?: string): Promise<{ available: boolean }> {
    if (!slug) throw new BadRequestException('slug is required.');
    return this.blog.checkSlug(slug, excludeId);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminBlogPost> {
    return this.blog.get(id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: BlogPostInputDto): Promise<AdminBlogPost> {
    return this.blog.create(user.userId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlogPostInputDto,
  ): Promise<AdminBlogPost> {
    return this.blog.update(user.userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ ok: true }> {
    await this.blog.deleteDraft(user.userId, id);
    return { ok: true };
  }

  @Post(':id/publish')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async publish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<BlogPublishResult> {
    try {
      return await this.blog.publish(user.userId, id);
    } catch (err) {
      throw toHttpException(err);
    }
  }

  @Post(':id/unpublish')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async unpublish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<AdminBlogPost> {
    try {
      return await this.blog.unpublish(user.userId, id);
    } catch (err) {
      throw toHttpException(err);
    }
  }

  /**
   * Cover images are hosted permanently in Supabase Storage, not committed
   * into the repo -- see AdminBlogService.uploadCoverImage's own doc
   * comment. Still goes through the API (service-role Storage write), same
   * reasoning as ProfileController.uploadAvatar: never direct
   * browser-to-Storage.
   */
  @Post('cover-image')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: COVER_IMAGE_MAX_BYTES } }))
  async uploadCoverImage(@UploadedFile() file?: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    if (!COVER_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException("That file type isn't supported (allowed: jpeg, png, webp).");
    }
    return this.blog.uploadCoverImage(file);
  }

  /**
   * The editor's media library -- as many images/audio files as an admin
   * wants to insert into the body at the cursor, not just the two
   * dedicated cover-image fields. See AdminBlogService.uploadMedia. Video
   * uses the separate presign-video endpoint below instead.
   */
  @Post('media')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MEDIA_MAX_BYTES } }))
  async uploadMedia(@UploadedFile() file?: Express.Multer.File): Promise<BlogMediaUploadResult> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    if (!MEDIA_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException("That file type isn't supported (allowed: common image/audio formats).");
    }
    return this.blog.uploadMedia(file);
  }

  /**
   * The editor's media library, video case: returns a short-lived R2
   * presigned PUT URL the browser uploads the file straight to -- this
   * request body is just metadata (filename/contentType/fileSize), never
   * the video itself, so there's no multer/memoryStorage size ceiling to
   * worry about here (see AdminBlogService.presignVideoUpload and
   * R2Service).
   */
  @Post('media/presign-video')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  presignVideo(@Body() dto: PresignBlogVideoDto): Promise<BlogVideoPresignResult> {
    return this.blog.presignVideoUpload(dto);
  }
}

function toHttpException(err: unknown): HttpException {
  if (err instanceof GithubPublishError) {
    return new HttpException({ code: err.code, message: err.message, retryable: err.retryable }, GITHUB_ERROR_STATUS[err.code]);
  }
  if (err instanceof HttpException) return err;
  return new HttpException({ code: 'unknown', message: 'Something went wrong. Try again.', retryable: true }, 500);
}
