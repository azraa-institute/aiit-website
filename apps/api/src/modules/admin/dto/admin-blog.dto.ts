import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { BlogLayoutPreset } from '@aiit/shared';

/** Kept local (not @aiit/shared, which is type-only) so this literal array is a compile error to forget updating alongside BlogLayoutPreset. */
export const BLOG_LAYOUT_PRESETS = [
  'editorial',
  'tutorial',
  'news-brief',
  'spotlight',
  'data-deep-dive',
  'listicle',
  'case-study',
  'visual-essay',
  'magazine',
  'video-feature',
] as const;
void (BLOG_LAYOUT_PRESETS satisfies readonly BlogLayoutPreset[]);

export class BlogPostInputDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug may only contain lowercase letters, numbers and hyphens.' })
  @MaxLength(160)
  slug!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(400)
  excerpt!: string;

  @IsString()
  @MinLength(1)
  bodyMarkdown!: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  coverImage2Url?: string | null;

  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags!: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  readMinutes?: number | null;

  @IsBoolean()
  featured!: boolean;

  @IsIn(BLOG_LAYOUT_PRESETS)
  preset!: BlogLayoutPreset;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoDescription?: string | null;

  @IsOptional()
  @IsString()
  ogImageUrl?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;
}

export class ListBlogPostsQueryDto {
  @IsOptional()
  @IsIn(['draft', 'scheduled', 'published', 'archived'])
  status?: 'draft' | 'scheduled' | 'published' | 'archived';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

/** Allowed for the direct-to-R2 presigned video path -- see AdminBlogService.presignVideoUpload. */
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

/** 2GiB -- generous for a blog post's embedded video while still bounding R2 storage/egress cost; raise here (and nowhere else) if that's ever too small. */
export const VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;

export class PresignBlogVideoDto {
  @IsString()
  @MaxLength(260)
  filename!: string;

  @IsIn(VIDEO_MIME_TYPES)
  contentType!: (typeof VIDEO_MIME_TYPES)[number];

  @IsInt()
  @IsPositive()
  @Max(VIDEO_MAX_BYTES)
  fileSize!: number;
}
