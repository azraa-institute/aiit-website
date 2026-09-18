import { IsISO31661Alpha2 } from 'class-validator';

export class ListStatesQueryDto {
  /** ISO 3166-1 alpha-2, e.g. ?country=NG. Required -- there is no "list every state worldwide" use case in this UI, only "states in the country the learner just picked". */
  @IsISO31661Alpha2()
  country!: string;
}
