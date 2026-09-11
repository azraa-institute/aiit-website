import { useEffect, useState } from 'react';
import type { CourseDetail, CourseListItem } from '@aiit/shared';
import type { Course } from '@/data/types';
import { apiFetch, ApiError } from '@/lib/api';

/**
 * Maps the API's catalogue shapes onto the frontend's existing `Course`
 * type so CourseCard/CourseFilters/filterCourses.ts (all static-data-era
 * code) keep working unmodified. `domainId` is set to the domain's slug,
 * not a UUID -- getDomain() in data/technologies.ts already resolves by
 * either id or slug, and the seeded domain slugs match the static ones.
 */
function baseFields(item: CourseListItem) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    categoryId: '',
    domainId: item.domain?.slug ?? null,
    summary: item.summary,
    price: item.price.amountCents,
    priceWas: item.price.wasAmountCents,
    currency: item.price.currency,
    pricing: item.pricing,
    level: item.level,
    durationHours: item.durationHours,
    durationLabel: item.durationLabel,
    rating: item.rating,
    ratingCount: item.ratingCount,
    enrolled: item.enrolledCount,
    statuses: item.badges,
    instructorId: item.instructorId,
    image: item.image,
    curriculum: [],
    publishedAt: item.publishedAt ?? '',
    updatedAt: item.publishedAt ?? '',
  };
}

/** List rows don't carry description/outcomes/etc -- summary stands in for description so search (which reads it) still has real text to match. */
function toCourseListEntry(item: CourseListItem): Course {
  return {
    ...baseFields(item),
    description: item.summary,
    outcomes: [],
    requirements: [],
    audience: [],
    toolsCovered: [],
    certification: '',
  };
}

function toCourseDetailEntry(item: CourseDetail): Course {
  return {
    ...baseFields(item),
    description: item.description,
    outcomes: item.outcomes,
    requirements: item.requirements,
    audience: item.audience,
    toolsCovered: item.toolsCovered,
    certification: item.certification,
  };
}

let listInFlight: Promise<CourseListItem[]> | null = null;

function loadCourseList(): Promise<CourseListItem[]> {
  if (!listInFlight) listInFlight = apiFetch<CourseListItem[]>('/courses');
  return listInFlight;
}

export type CourseListState =
  | { status: 'loading'; courses: null; error: null }
  | { status: 'ready'; courses: Course[]; error: null }
  | { status: 'error'; courses: null; error: Error };

export function useCourseList(): CourseListState {
  const [state, setState] = useState<CourseListState>({ status: 'loading', courses: null, error: null });

  useEffect(() => {
    let alive = true;
    loadCourseList()
      .then((items) => {
        if (alive) setState({ status: 'ready', courses: items.map(toCourseListEntry), error: null });
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            status: 'error',
            courses: null,
            error: error instanceof Error ? error : new Error('Could not load courses.'),
          });
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export type CourseDetailState =
  | { status: 'loading'; course: null; error: null }
  | { status: 'ready'; course: Course; error: null }
  | { status: 'notFound'; course: null; error: null }
  | { status: 'error'; course: null; error: Error };

export function useCourseDetail(slug: string | undefined): CourseDetailState {
  const [state, setState] = useState<CourseDetailState>({ status: 'loading', course: null, error: null });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'notFound', course: null, error: null });
      return;
    }

    let alive = true;
    setState({ status: 'loading', course: null, error: null });

    apiFetch<CourseDetail>(`/courses/${encodeURIComponent(slug)}`)
      .then((item) => {
        if (alive) setState({ status: 'ready', course: toCourseDetailEntry(item), error: null });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: 'notFound', course: null, error: null });
        } else {
          setState({
            status: 'error',
            course: null,
            error: error instanceof Error ? error : new Error('Could not load this course.'),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [slug]);

  return state;
}
