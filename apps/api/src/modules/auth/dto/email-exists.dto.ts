import { IsEmail } from 'class-validator';

export class EmailExistsQueryDto {
  @IsEmail()
  email!: string;
}
