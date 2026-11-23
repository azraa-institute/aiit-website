import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { CatalogueCategorySlug, CourseBadge, CourseLevel, CourseStatus, CourseTechnologyType, PricingModel } from '@aiit/shared';

// Mirrors apps/web/src/data/catalogueCategories.ts's CATALOGUE_CATEGORIES --
// the one fixed set of 9, kept in sync by hand (see that file's own doc
// comment for why this can't be a live cross-workspace import).
export const CATALOGUE_CATEGORY_SLUGS = [
  'artificial-intelligence-intelligent-systems',
  'data-science-analytics',
  'cloud-computing-devops',
  'cybersecurity-networking',
  'emerging-advanced-computing',
  'blockchain-web3',
  'digital-business-marketing',
  'technology-management-business',
  'foundation-digital-literacy',
] as const;

export const COURSE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'All levels',
  'Absolute Beginner',
  'Beginner–Intermediate',
  'Intermediate–Advanced',
] as const;

export const COURSE_PRICING_MODELS = ['paid', 'free', 'subscription'] as const;
export const COURSE_BADGES = ['featured', 'new', 'hot', 'special', 'coming-soon'] as const;
export const COURSE_STATUSES = ['draft', 'published'] as const;
export const COURSE_TECHNOLOGY_TYPES = ['platform', 'framework', 'tool', 'library', 'language', 'protocol', 'concept'] as const;
export const COURSE_TECHNOLOGY_TIERS = ['core', 'optional'] as const;

export class CourseTechnologyDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsIn(COURSE_TECHNOLOGY_TYPES)
  type!: CourseTechnologyType;

  @IsString()
  @MaxLength(40)
  icon!: string;

  @IsOptional()
  @IsIn(COURSE_TECHNOLOGY_TIERS)
  tier?: 'core' | 'optional';
}

export class CourseInputDto {
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
  @MaxLength(100)
  categoryName!: string;

  @IsOptional()
  @IsUUID('4')
  domainId?: string | null;

  @IsIn(CATALOGUE_CATEGORY_SLUGS)
  catalogueCategory!: CatalogueCategorySlug;

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CourseTechnologyDto)
  technologies!: CourseTechnologyDto[];

  @IsString()
  @MinLength(10)
  @MaxLength(400)
  summary!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceUsdCents!: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceWasUsdCents?: number | null;

  @IsIn(COURSE_PRICING_MODELS)
  pricing!: PricingModel;

  @IsIn(COURSE_LEVELS)
  level!: CourseLevel;

  @IsInt()
  @Min(1)
  @Max(2000)
  durationHours!: number;

  @IsString()
  @MaxLength(80)
  durationLabel!: string;

  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(COURSE_BADGES, { each: true })
  badges!: CourseBadge[];

  @IsString()
  @MaxLength(400)
  image!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  outcomes!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  requirements!: string[];

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  audience!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  toolsCovered!: string[];

  @IsString()
  @MaxLength(400)
  certification!: string;

  @IsIn(COURSE_STATUSES)
  status!: CourseStatus;

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}
