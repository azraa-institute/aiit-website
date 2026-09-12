/**
 * Shared between apps/web and apps/api. Type-only by design: apps/api runs as
 * a compiled Node process, so a runtime export here without a build step
 * would ship a broken `require()` of a .ts file. Add a build step before this
 * package ever exports real values (e.g. a Zod schema helper in Phase 1).
 */

/** Shape returned by the API's health endpoints. */
export interface HealthStatus {
  status: 'ok' | 'error';
  service: string;
}

export * from './api';
export * from './auth';
export * from './catalogue';
export * from './enrollment';
export * from './assignment';
