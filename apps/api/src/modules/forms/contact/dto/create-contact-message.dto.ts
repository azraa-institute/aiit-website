import { IsEmail, IsIn, IsString, MaxLength } from 'class-validator';

const TOPICS = ['course', 'enrolment', 'blueprint', 'webinar', 'partnership', 'other'] as const;

export class CreateContactMessageDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsIn(TOPICS)
  topic!: string;

  @IsString()
  @MaxLength(4000)
  message!: string;

  @IsString()
  turnstileToken!: string;
}
