/** Curated IANA time zones for the profile-completion wizard's Location step -- not the full ~400-zone database, just AIIT's stated target markets (Nigeria, Ghana, Kenya, India, the Philippines, etc.) plus other major regions, so the picker stays usable. The detected browser zone (Intl.DateTimeFormat().resolvedOptions().timeZone) pre-fills the field even if it isn't in this list. */
export const TIME_ZONES: { value: string; label: string }[] = [
  { value: 'Africa/Lagos', label: 'Lagos, West Africa Time' },
  { value: 'Africa/Accra', label: 'Accra, Ghana' },
  { value: 'Africa/Nairobi', label: 'Nairobi, East Africa Time' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg, South Africa' },
  { value: 'Africa/Cairo', label: 'Cairo, Egypt' },
  { value: 'Africa/Casablanca', label: 'Casablanca, Morocco' },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa, Ethiopia' },
  { value: 'Africa/Kampala', label: 'Kampala, Uganda' },
  { value: 'Europe/London', label: 'London, UK' },
  { value: 'Europe/Dublin', label: 'Dublin, Ireland' },
  { value: 'Europe/Paris', label: 'Paris, Central Europe' },
  { value: 'Europe/Berlin', label: 'Berlin, Central Europe' },
  { value: 'Europe/Madrid', label: 'Madrid, Spain' },
  { value: 'Europe/Lisbon', label: 'Lisbon, Portugal' },
  { value: 'Europe/Moscow', label: 'Moscow, Russia' },
  { value: 'Europe/Istanbul', label: 'Istanbul, Turkey' },
  { value: 'Asia/Dubai', label: 'Dubai, UAE' },
  { value: 'Asia/Riyadh', label: 'Riyadh, Saudi Arabia' },
  { value: 'Asia/Karachi', label: 'Karachi, Pakistan' },
  { value: 'Asia/Kolkata', label: 'Mumbai / Delhi, India' },
  { value: 'Asia/Dhaka', label: 'Dhaka, Bangladesh' },
  { value: 'Asia/Bangkok', label: 'Bangkok, Thailand' },
  { value: 'Asia/Jakarta', label: 'Jakarta, Indonesia' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur, Malaysia' },
  { value: 'Asia/Manila', label: 'Manila, Philippines' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Asia/Shanghai', label: 'Shanghai, China' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Japan' },
  { value: 'Asia/Seoul', label: 'Seoul, South Korea' },
  { value: 'Australia/Sydney', label: 'Sydney, Australia' },
  { value: 'Australia/Perth', label: 'Perth, Australia' },
  { value: 'Pacific/Auckland', label: 'Auckland, New Zealand' },
  { value: 'America/New_York', label: 'New York, US Eastern' },
  { value: 'America/Chicago', label: 'Chicago, US Central' },
  { value: 'America/Denver', label: 'Denver, US Mountain' },
  { value: 'America/Los_Angeles', label: 'Los Angeles, US Pacific' },
  { value: 'America/Toronto', label: 'Toronto, Canada' },
  { value: 'America/Mexico_City', label: 'Mexico City, Mexico' },
  { value: 'America/Sao_Paulo', label: 'São Paulo, Brazil' },
  { value: 'America/Bogota', label: 'Bogotá, Colombia' },
];

/** Best-effort detection of the browser's own IANA zone, for pre-filling the field -- never throws. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * The zone's current UTC offset as "GMT+1" / "GMT-11:30" / "GMT+0", read
 * straight from the platform's own IANA tz database via Intl (never
 * hardcoded) so it's correct for whatever moment it's called at, DST
 * included -- e.g. Europe/London reads "GMT+0" in January and "GMT+1" in
 * July. This is a label computed once per render, not a ticking clock (the
 * live-updating time display was explicitly asked to stay out of the UI).
 */
export function gmtOffsetLabel(zone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(
      at,
    );
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (!offset) return '';
    // formatToParts gives bare "GMT" for zones exactly at UTC -- normalize
    // to "GMT+0" so every entry reads consistently.
    return offset === 'GMT' ? 'GMT+0' : offset;
  } catch {
    return '';
  }
}

/** A curated zone's display label with its live GMT offset appended, e.g. "Lagos, West Africa Time (GMT+1)". Falls back to the bare IANA id for a zone outside the curated list (still with its offset, if computable). */
export function formatTimeZoneLabel(zone: string): string {
  const base = TIME_ZONES.find((t) => t.value === zone)?.label ?? zone;
  const offset = gmtOffsetLabel(zone);
  return offset ? `${base} (${offset})` : base;
}

/**
 * Options for the "Time zone" <select>, always including `current` even
 * when it isn't one of the curated TIME_ZONES -- e.g. a browser can report
 * a legacy IANA alias (confirmed live: "Asia/Calcutta" instead of the
 * canonical "Asia/Kolkata"), which would otherwise silently fail to match
 * any <option> and render the field as blank despite a real value being set.
 */
export function timeZoneOptions(current: string): { value: string; label: string }[] {
  const base = [
    { value: '', label: 'Select your time zone' },
    ...TIME_ZONES.map((t) => ({ value: t.value, label: formatTimeZoneLabel(t.value) })),
  ];
  if (current && !TIME_ZONES.some((t) => t.value === current)) {
    base.push({ value: current, label: formatTimeZoneLabel(current) });
  }
  return base;
}
