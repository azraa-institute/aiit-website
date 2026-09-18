import { useEffect, useState } from 'react';
import type { SearchableSelectOption } from '@/components/common/SearchableSelect';

interface RawUniversity {
  name: string;
  country: string;
}

/** Not filtered by the learner's already-selected country -- the wizard
 * asks for education (where the university field lives) before location
 * (phase 2 vs phase 4), so there's no country to filter by yet at the
 * point this is used. Searches the full Asia+Africa list instead. */
const UNIVERSITIES_URL = '/data/universities-asia-africa.json';

let cache: Promise<RawUniversity[]> | null = null;

/** Lazily fetches the bundled Asia+Africa universities list (~4,200
 * institutions, public/data/universities-asia-africa.json -- built from
 * the Hipo/university-domains-list open dataset, filtered to Asia/Africa
 * countries) once per browser tab and shares the same promise across
 * every caller (the onboarding wizard and the profile page both use it),
 * rather than each firing its own fetch. Static, not an API call -- a
 * university list doesn't need to be "live", so there's no backend
 * involved here at all. */
function loadUniversities(): Promise<RawUniversity[]> {
  if (!cache) {
    cache = fetch(UNIVERSITIES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load the university list (${res.status}).`);
        return res.json() as Promise<RawUniversity[]>;
      })
      .catch((err: unknown) => {
        // Don't cache a failure -- a transient network blip shouldn't
        // permanently break the picker for the rest of the tab's session.
        cache = null;
        throw err;
      });
  }
  return cache;
}

/** University options for SearchableSelect, plus a loading flag while the
 * list is still being fetched. `country` is shown as each option's meta
 * text so same-named institutions in different countries (a small number
 * in the source data) are still distinguishable in the list. */
export function useUniversityOptions(): { options: SearchableSelectOption[]; loading: boolean } {
  const [options, setOptions] = useState<SearchableSelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadUniversities()
      .then((list) => {
        if (!alive) return;
        setOptions(list.map((u) => ({ value: u.name, label: u.name, meta: u.country })));
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { options, loading };
}
