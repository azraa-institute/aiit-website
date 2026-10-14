import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateInstructorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;
}

export class CreateAdminDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class AdminEnrollDto {
  @IsUUID()
  courseId!: string;
}

export class SuspendUserDto {
  @IsString()
  @MinLength(3, { message: 'Give a short reason so the record shows why.' })
  @MaxLength(500)
  reason!: string;
}

export class ListStudentsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'pending_deletion'])
  status?: 'active' | 'suspended' | 'pending_deletion';

  @IsOptional()
  @IsUUID()
  courseId?: string;

  /**
   * Default false: an account that's only ever been an affiliate (never
   * enrolled in a course) is filtered out of this list -- there's already
   * a dedicated Affiliates page for them, and showing them here alongside
   * real students reads as a data mix-up even though it isn't one (see
   * schema.prisma's comment on the Affiliate model). Pass true to show
   * them anyway. An affiliate who HAS enrolled in something always shows,
   * regardless of this flag -- they're a real student too.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeAffiliates?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(5)
  @Max(100)
  pageSize?: number;
}

export class ListAuditQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  targetType?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}

export class ListMessagesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}
