import { ArrayMaxSize, IsArray, IsISO31661Alpha2, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  /**
   * E.164 format (e.g. +14155552671) -- required so it's a valid input to
   * Supabase Auth's phone-OTP flow (supabase.auth.updateUser({ phone })).
   * Setting this via PATCH /me does NOT mark it verified -- verification
   * only happens through POST /me/phone/confirm, which checks the *auth*
   * user's phone_confirmed_at server-side. Changing this value clears any
   * previous verification (see ProfileService.updateProfile).
   */
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phone must be in E.164 format, e.g. +14155552671' })
  phone?: string;

  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarKey?: string;

  /** Highest qualification -- UI offers a fixed picklist plus "Other", stored as free text. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  qualification?: string;

  /** Institution attended -- AIIT is not itself an accredited university; this is the learner's own prior/current one. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  university?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  /** Discipline/major -- UI offers a free-text field, not a fixed picklist (too varied to enumerate). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fieldOfStudy?: string;

  /** Student / working professional / job seeker / other -- UI offers a fixed picklist, stored as free text. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  currentStatus?: string;

  /** Primary reason for joining -- UI offers a fixed picklist plus "Other", stored as free text. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  learningGoal?: string;

  /** Learning-area interest cards the learner selected (see data/learningAreas.ts) -- capped well above the real option count as a sanity bound, not a UI constraint. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  areasOfInterest?: string[];

  /** IANA time zone, e.g. "Africa/Lagos" -- client-detected default via Intl.DateTimeFormat, editable. Free text (not validated against the IANA database) since class-validator has no built-in check and the set changes over time; an invalid value just fails to format dates usefully client-side, no security/integrity risk. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timeZone?: string;
}
