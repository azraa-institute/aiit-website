/** GET /geo/states response item -- a state/province within one country. */
export interface GeoState {
  id: number;
  name: string;
}

/** GET /geo/cities response item -- a city within one state. */
export interface GeoCity {
  id: number;
  name: string;
}
