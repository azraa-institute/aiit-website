import { IsBoolean, IsUUID } from 'class-validator';

export class LogConsentDto {
  /** A random id the frontend generates once and keeps in localStorage
   * alongside the consent choice -- see CookieConsentLog in schema.prisma. */
  @IsUUID()
  visitorId!: string;

  @IsBoolean()
  analytics!: boolean;

  @IsBoolean()
  preferences!: boolean;
}
