import { useEffect, useState } from 'react';
import type { Assignment, Certificate, Enrollment, Me, Notification } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

/**
 * Learner portal data layer. Fetches the real backend (Phase 1's auth
 * endpoints + the Phase 2 enrollment/assignment/certificate/notification
 * modules) in parallel and assembles one LearnerRecord, so every page keeps
 * branching on the same loading/ready/error shape it always has.
 *
 * `email` deliberately isn't part of LearnerProfile -- the API's Profile
 * model doesn't store it (Supabase's auth.users owns that); anywhere email
 * needs to be shown, read it from useAuth()'s session instead.
 *
 * Webinar registrations have no real backend yet (out of scope this phase)
 * -- always empty, same honest "nothing to show" behaviour as before, not a
 * stub pretending to be real.
 */

export interface LearnerProfile {
  name: string | null;
  headline: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  qualification: string | null;
  university: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  avatarKey: string | null;
  preferences: Record<string, unknown>;
  joinedAt: string;
}

export interface WebinarRegistration {
  id: string;
  title: string;
  startsAt?: string;
  status: 'upcoming' | 'attended' | 'missed';
  joinUrl?: string;
}

export interface NextAction {
  label: string;
  href: string;
  context?: string;
}

export interface LearnerRecord {
  profile: LearnerProfile;
  enrolled: Enrollment[];
  certificates: Certificate[];
  assignments: Assignment[];
  notifications: Notification[];
  webinars: WebinarRegistration[];
  /** True only right after a genuine first-ever signup (Google or email/password) -- the API's real signal for the portal's one-time welcome toast. */
  isNewSignup: boolean;
  /** From the API's computed Me.profileComplete -- drives the completion wizard/banner and the RequireCompleteProfile route guard. */
  profileComplete: boolean;
}

async function fetchLearner(): Promise<LearnerRecord> {
  const [me, enrolled, assignments, certificates, notifications] = await Promise.all([
    apiFetch<Me>('/auth/me'),
    apiFetch<Enrollment[]>('/me/enrollments'),
    apiFetch<Assignment[]>('/me/assignments'),
    apiFetch<Certificate[]>('/me/certificates'),
    apiFetch<Notification[]>('/me/notifications'),
  ]);

  return {
    profile: {
      name: me.name,
      headline: me.headline,
      phone: me.phone,
      phoneVerifiedAt: me.phoneVerifiedAt,
      qualification: me.qualification,
      university: me.university,
      country: me.country,
      city: me.city,
      address: me.address,
      postalCode: me.postalCode,
      avatarKey: me.avatarKey,
      preferences: me.preferences,
      joinedAt: me.createdAt,
    },
    enrolled,
    assignments,
    certificates,
    notifications,
    webinars: [],
    isNewSignup: me.isNewSignup,
    profileComplete: me.profileComplete,
  };
}

let inFlight: Promise<LearnerRecord> | null = null;

/** Memoised for the session so every useLearner() caller shares one request. */
export function loadLearner(): Promise<LearnerRecord> {
  if (!inFlight) inFlight = fetchLearner();
  return inFlight;
}

/**
 * Every mounted useLearner() instance registers itself here so
 * invalidateLearner() can tell all of them to refetch, not just whichever
 * component happened to call it -- e.g. saving a profile photo on
 * ProfilePage now also updates PortalLayout's topbar avatar immediately,
 * since PortalLayout stays mounted underneath it (it's the layout, not a
 * sibling route) and previously only picked up the change on its own next
 * mount.
 */
const listeners = new Set<() => void>();

/** Call after any action that changes the learner record server-side (enroll, submit, mark-read, profile edit) -- refetches every mounted useLearner() instance, not just the caller's. */
export function invalidateLearner(): void {
  inFlight = null;
  listeners.forEach((notify) => notify());
}

/**
 * `inFlight` above is a module-level cache -- it survives for the whole
 * browser tab's lifetime, not just one signed-in session. Without this,
 * user A signing out and user B signing in afterwards (same tab, no hard
 * reload) would still see `loadLearner()` return A's already-cached
 * record: RequireAuth remounting PortalLayout doesn't help, since a fresh
 * useLearner() instance still just asks this same module-level cache,
 * which has no idea the signed-in user changed underneath it. Runs once
 * at module load (this file is only ever imported once, like `inFlight`
 * itself) and invalidates whenever the session's user id actually
 * changes -- not on every auth event, since a token refresh for the same
 * user fires one too and shouldn't force a needless refetch.
 */
if (supabase) {
  let lastUserId: string | null | undefined; // undefined = baseline not yet recorded
  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user.id ?? null;
    if (lastUserId !== undefined && userId !== lastUserId) {
      invalidateLearner();
    }
    lastUserId = userId;
  });
}

export type LearnerState =
  | { status: 'loading'; learner: null; error: null }
  | { status: 'ready'; learner: LearnerRecord; error: null }
  | { status: 'error'; learner: null; error: Error };

/**
 * Portal-wide learner state. Components branch on `status` to show the
 * loading, error or ready experience; `ready` still covers a completely
 * empty account, which is a designed state, not a failure.
 *
 * `refetch()` invalidates the shared cache and reloads -- call it after an
 * action that changes the record server-side (submitting an assignment,
 * marking a notification read, saving a profile edit). Every mounted
 * useLearner() instance refetches, via the `listeners` broadcast above --
 * e.g. PortalLayout's topbar avatar updates immediately when ProfilePage
 * saves a new photo, even though PortalLayout is the layout underneath it
 * (always mounted, not a sibling route) rather than the component that
 * called refetch().
 */
/**
 * `enabled` (default true) lets a caller outside the portal shell -- the
 * public header's account widget, which needs the same name/avatar the
 * portal topbar shows but must never fetch for a signed-out visitor --
 * gate the fetch on its own auth check. No existing portal caller passes
 * this, so they're all unaffected; skipping the fetch just leaves the
 * hook parked at its initial 'loading' state until enabled flips true.
 */
export function useLearner(options?: { enabled?: boolean }): LearnerState & { refetch: () => void } {
  const enabled = options?.enabled ?? true;
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<LearnerState>({ status: 'loading', learner: null, error: null });

  useEffect(() => {
    if (!enabled) return;
    const notify = () => setReloadToken((t) => t + 1);
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    if (reloadToken > 0) setState({ status: 'loading', learner: null, error: null });
    loadLearner()
      .then((learner) => {
        if (alive) setState({ status: 'ready', learner, error: null });
      })
      .catch((error: unknown) => {
        if (alive)
          setState({
            status: 'error',
            learner: null,
            error: error instanceof Error ? error : new Error('Could not load your portal.'),
          });
      });
    return () => {
      alive = false;
    };
  }, [enabled, reloadToken]);

  return { ...state, refetch: invalidateLearner };
}

/* ---- Derived helpers (pure, data-driven) ---- */

export interface JourneyPhaseState {
  phase: 'learn' | 'practice' | 'certify' | 'progress' | 'globalize';
  label: string;
  /** 'complete' | 'active' | 'dormant' — never invented, always derived. */
  state: 'complete' | 'active' | 'dormant';
  /** Optional one-line, real context (e.g. "2 courses in progress"). */
  detail?: string;
}

const PHASE_LABEL: Record<JourneyPhaseState['phase'], string> = {
  learn: 'Learn',
  practice: 'Practice',
  certify: 'Certify',
  progress: 'Progress',
  globalize: 'Globalize',
};

/**
 * Maps the real learner record onto AIIT's five-phase journey. There's no
 * lesson-level progress signal yet (course curricula are empty), so this
 * works off enrollment/certificate status rather than a percentage --
 * "practice" is a simplified stand-in for "meaningfully underway", not the
 * finer-grained signal a real lesson-completion percentage would give.
 */
export function journeyPhases(learner: LearnerRecord): JourneyPhaseState[] {
  const active = learner.enrolled.filter((e) => e.status === 'active');
  const completed = learner.enrolled.filter((e) => e.status === 'completed');
  const hasCerts = learner.certificates.length > 0;

  const phase = (
    p: JourneyPhaseState['phase'],
    state: JourneyPhaseState['state'],
    detail?: string,
  ): JourneyPhaseState => ({ phase: p, label: PHASE_LABEL[p], state, detail });

  return [
    phase(
      'learn',
      active.length > 0 ? 'active' : learner.enrolled.length > 0 ? 'complete' : 'dormant',
      active.length > 0 ? countLabel(active.length, 'course') + ' in progress' : undefined,
    ),
    phase('practice', active.length > 0 ? 'active' : completed.length > 0 ? 'complete' : 'dormant'),
    phase(
      'certify',
      hasCerts && active.length === 0 && learner.enrolled.length > 0
        ? 'complete'
        : hasCerts
          ? 'active'
          : 'dormant',
      hasCerts ? countLabel(learner.certificates.length, 'certificate') + ' earned' : undefined,
    ),
    phase('progress', hasCerts && completed.length >= 2 ? 'active' : 'dormant'),
    phase('globalize', 'dormant'),
  ];
}

function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** The single most important thing for the learner to do next, or null. */
export function primaryNextAction(learner: LearnerRecord): NextAction | null {
  const urgentAssignment = learner.assignments.find((a) => a.status === 'overdue' || a.status === 'upcoming');
  if (urgentAssignment) {
    return {
      label: urgentAssignment.status === 'overdue' ? 'Submit overdue assignment' : 'View assignment',
      href: '/portal/assignments',
      context: urgentAssignment.title,
    };
  }

  const activeEnrollment = learner.enrolled.find((e) => e.status === 'active');
  if (activeEnrollment) {
    return {
      label: 'Continue course',
      href: `/courses/${activeEnrollment.course.slug}`,
      context: activeEnrollment.course.title,
    };
  }
  return null;
}

export function isEmptyLearner(learner: LearnerRecord): boolean {
  return learner.enrolled.length === 0 && learner.certificates.length === 0 && learner.assignments.length === 0;
}

export function greetingName(learner: LearnerRecord): string | null {
  const n = learner.profile.name?.trim();
  return n ? n.split(/\s+/)[0] : null;
}
