import { useCallback, useEffect, useState } from 'react';
import type { AdminCourse, AdminLiveClass, CourseListItem, InstructorSummary, Timetable } from '@aiit/shared';
import { apiFetch } from '@/lib/api';

/** Minimal fetch-with-reload hook for the admin screens. `path === null` skips the request. */
export type FetchState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

export function useAdminFetch<T>(path: string | null): FetchState<T> & { reload: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let alive = true;
    apiFetch<T>(path)
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((err: unknown) =>
        alive && setState({ status: 'error', message: err instanceof Error ? err.message : 'Could not load this.' }),
      );
    return () => {
      alive = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}

export const useAdminCourses = () => useAdminFetch<CourseListItem[]>('/courses');
/** Published courses with enrolment counts and assigned instructors (admin-only, richer than the public list). */
export const useAdminCourseList = () => useAdminFetch<AdminCourse[]>('/admin/courses');
export const useAdminInstructors = () => useAdminFetch<InstructorSummary[]>('/admin/instructors');
export const useAdminTimetables = () => useAdminFetch<Timetable[]>('/admin/timetables');
export const useAdminClasses = (courseId?: string) =>
  useAdminFetch<AdminLiveClass[]>(courseId ? `/admin/live-classes?courseId=${encodeURIComponent(courseId)}` : '/admin/live-classes');

export interface TimetableInput {
  courseId?: string;
  title: string;
  timeZone: string;
  startsOn: string;
  endsOn: string;
  hostUserId: string | null;
  slots: { weekday: number; startTime: string; durationMinutes: number }[];
}

export interface ClassInput {
  courseId?: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  hostUserId: string | null;
  joinOpensMinutes?: number;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function allTimeZones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  const zones = supported ? supported('timeZone') : [];
  return zones.length > 0 ? zones : [browserTimeZone(), 'UTC', 'Africa/Lagos'];
}

/** `datetime-local` value ("2026-10-05T18:00") for an ISO instant, in the admin's own zone. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function describeSlots(t: Timetable): string {
  return t.slots
    .map((s) => `${WEEKDAYS[s.weekday].slice(0, 3)} ${s.startTime} (${s.durationMinutes} min)`)
    .join(' · ');
}
