/**
 * Stored in Profile.preferences.language (free-form JSON, no server-side
 * enum) -- AIIT's own content is English-only today, so this is a genuine
 * preference the platform records and can act on later (e.g. translated
 * course content, localized emails), not cosmetic.
 */
export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
];
