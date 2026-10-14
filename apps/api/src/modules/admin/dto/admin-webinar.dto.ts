import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { WebinarStatus } from '@aiit/shared';

export const WEBINAR_STATUSES = ['upcoming', 'live', 'past'] as const;

export class WebinarAgendaItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  points!: string[];
}

export class WebinarInputDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug may only contain lowercase letters, numbers and hyphens.' })
  @MaxLength(160)
  slug!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  heroHeadline!: string;

  @IsString()
  @MaxLength(160)
  kicker!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(400)
  summary!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsString()
  @MaxLength(80)
  scheduleNote!: string;

  @IsString()
  @MaxLength(40)
  durationLabel!: string;

  @IsString()
  @MaxLength(80)
  timezoneNote!: string;

  @IsString()
  @MaxLength(80)
  platform!: string;

  @IsString()
  @MaxLength(40)
  language!: string;

  @IsBoolean()
  seatsLimited!: boolean;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => WebinarAgendaItemDto)
  agenda!: WebinarAgendaItemDto[];

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  audience!: string[];

  @IsString()
  @MaxLength(400)
  image!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoThumbnail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  joinUrl?: string | null;

  @IsIn(WEBINAR_STATUSES)
  status!: WebinarStatus;

  @IsBoolean()
  featured!: boolean;
}

export class SendWebinarReminderDto {
  @IsIn(['24h', '30m'])
  kind!: '24h' | '30m';
}
