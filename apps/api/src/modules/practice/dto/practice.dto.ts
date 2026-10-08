import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class QuizOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class QuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Each question needs at least two options.' })
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options!: QuizOptionDto[];
}

export class CreateQuizDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'A quiz needs at least one question.' })
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}

export class UpdateQuizDto extends CreateQuizDto {}

export class SubmitQuizAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  optionId!: string;
}

export class SubmitQuizAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers!: SubmitQuizAnswerDto[];
}
