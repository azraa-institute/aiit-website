import type { GeoCity, GeoState } from '@aiit/shared';
import { apiFetch } from './api';

/** States/provinces in one country -- powers the profile forms' Country -> State cascade. Public endpoint (no auth header needed, but apiFetch sends one anyway if signed in; harmless). */
export function fetchStates(countryCode: string): Promise<GeoState[]> {
  return apiFetch<GeoState[]>(`/geo/states?country=${encodeURIComponent(countryCode)}`);
}

/** Cities in one state -- powers the State -> City cascade. */
export function fetchCities(stateId: number): Promise<GeoCity[]> {
  return apiFetch<GeoCity[]>(`/geo/cities?state=${encodeURIComponent(String(stateId))}`);
}
