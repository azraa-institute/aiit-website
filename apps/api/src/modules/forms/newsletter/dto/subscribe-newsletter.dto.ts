import { IsEmail, IsString } from 'class-validator';

export class SubscribeNewsletterDto {
  @IsEmail()
  email!: string;

  @IsString()
  turnstileToken!: string;
}
