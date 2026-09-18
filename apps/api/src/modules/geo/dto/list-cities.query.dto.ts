import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ListCitiesQueryDto {
  /** GeoState.id, e.g. ?state=2686. Required -- same reasoning as ListStatesQueryDto: only "cities in the state the learner just picked" is ever asked for. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  state!: number;
}
