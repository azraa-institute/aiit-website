import { Controller, Get, Query } from '@nestjs/common';
import type { GeoCity, GeoState } from '@aiit/shared';
import { GeoService } from './geo.service';
import { ListStatesQueryDto } from './dto/list-states.query.dto';
import { ListCitiesQueryDto } from './dto/list-cities.query.dto';

// Public, no JwtGuard -- same call as DomainsController/CoursesController:
// this is non-sensitive reference data (place names), not learner data, so
// there's no reason to require a session just to look up "states in NG".
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('states')
  states(@Query() query: ListStatesQueryDto): Promise<GeoState[]> {
    return this.geo.listStates(query.country);
  }

  @Get('cities')
  cities(@Query() query: ListCitiesQueryDto): Promise<GeoCity[]> {
    return this.geo.listCities(query.state);
  }
}
