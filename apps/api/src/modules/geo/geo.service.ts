import { Injectable } from '@nestjs/common';
import type { GeoCity, GeoState } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Powers the Profile wizard/page's Country -> State -> City cascade.
 * Read-only reference data seeded once directly in migration
 * 20260918160000_geo_lookup_and_profile_state's own SQL (from the
 * dr5hn/countries-states-cities-database open dataset) -- nothing here
 * ever writes to geo_states/geo_cities, so there's no create/update/delete
 * to speak of, just the two lookups below.
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  listStates(countryCode: string): Promise<GeoState[]> {
    return this.prisma.geoState.findMany({
      where: { countryCode: countryCode.toUpperCase() },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  listCities(stateId: number): Promise<GeoCity[]> {
    return this.prisma.geoCity.findMany({
      where: { stateId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
