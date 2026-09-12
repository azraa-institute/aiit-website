import { IsString } from 'class-validator';

/** Shared shape for both /newsletter/confirm and /newsletter/unsubscribe -- each takes its own kind of token, but the request shape is identical. */
export class NewsletterTokenDto {
  @IsString()
  token!: string;
}
