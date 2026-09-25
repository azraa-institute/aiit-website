import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class TimetableSlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @Matches(HH_MM, { message: 'startTime must be HH:MM (24-hour).' })
  startTime!: string;

  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes!: number;
}

export class CreateTimetableDto {
  @IsUUID()
  courseId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(60)
  timeZone!: string;

  @Matches(DATE_ONLY, { message: 'startsOn must be YYYY-MM-DD.' })
  startsOn!: string;

  @Matches(DATE_ONLY, { message: 'endsOn must be YYYY-MM-DD.' })
  endsOn!: string;

  @IsOptional()
  @IsUUID()
  hostUserId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => TimetableSlotDto)
  slots!: TimetableSlotDto[];
}

/** Everything but the course can change after creation. */
export class UpdateTimetableDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timeZone?: string;

  @IsOptional()
  @Matches(DATE_ONLY, { message: 'startsOn must be YYYY-MM-DD.' })
  startsOn?: string;

  @IsOptional()
  @Matches(DATE_ONLY, { message: 'endsOn must be YYYY-MM-DD.' })
  endsOn?: string;

  @IsOptional()
  @IsUUID()
  hostUserId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => TimetableSlotDto)
  slots?: TimetableSlotDto[];
}

export class CreateLiveClassDto {
  @IsUUID()
  courseId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsUUID()
  hostUserId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  joinOpensMinutes?: number;
}

export class UpdateLiveClassDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsUUID()
  hostUserId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  joinOpensMinutes?: number;

  /** The only status an admin sets by hand -- live/ended are driven by the instructor in the classroom. */
  @IsOptional()
  @IsIn(['cancelled'])
  status?: 'cancelled';
}
