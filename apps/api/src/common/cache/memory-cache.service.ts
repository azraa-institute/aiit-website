import { Global, Injectable, Module } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Tiny in-process TTL cache for cheap, non-personalized public reads
 * (course listings, geo reference lookups, ...) -- not a new infrastructure
 * dependency, same hand-rolled pattern CurrencyService already uses for its
 * own FX-rate cache. The part that actually matters for a traffic spike
 * isn't "repeat visitors are faster" (that alone wouldn't help much), it's
 * that concurrent cache-miss callers for the SAME key share one in-flight
 * fetch instead of each hitting the database -- 5000 simultaneous requests
 * for the course list cost one query, not 5000.
 *
 * Process-local only. Fine for a single API instance (this one is); if it
 * ever isn't, a miss here just falls through to the database like normal --
 * it would simply happen more often across instances that don't share a
 * process. Move to Redis then, not before.
 */
@Injectable()
export class MemoryCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  async getOrSet<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = fetcher()
      .then((value) => {
        this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, promise);
    return promise;
  }
}

@Global()
@Module({ providers: [MemoryCacheService], exports: [MemoryCacheService] })
export class MemoryCacheModule {}
