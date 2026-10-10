import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

class QuillTurnDto {
  @IsIn(['visitor', 'quill'])
  role!: 'visitor' | 'quill';

  @IsString()
  @MaxLength(1000)
  text!: string;
}

export class QuillChatDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsString()
  courseSlug!: string;

  // Capped at 8 turns -- plenty for short-term context ("and the price?"
  // right after asking about duration), without trusting an unbounded body
  // on a public, unauthenticated endpoint.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => QuillTurnDto)
  history?: QuillTurnDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  missCount?: number;
}
