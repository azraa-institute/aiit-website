import { Injectable } from '@nestjs/common';
import type { GeoCity, GeoState } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';

/** This never changes at runtime (seed-only data, see the class doc comment below), so a long TTL costs nothing in staleness. */
const CACHE_TTL_MS = 10 * 60_000;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: MemoryCacheService,
  ) {}

  listStates(countryCode: string): Promise<GeoState[]> {
    const code = countryCode.toUpperCase();
    return this.cache.getOrSet(`geo:states:${code}`, CACHE_TTL_MS, () =>
      this.prisma.geoState.findMany({
        where: { countryCode: code },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    );
  }

  listCities(stateId: number): Promise<GeoCity[]> {
    return this.cache.getOrSet(`geo:cities:${stateId}`, CACHE_TTL_MS, () =>
      this.prisma.geoCity.findMany({
        where: { stateId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    );
  }
}
