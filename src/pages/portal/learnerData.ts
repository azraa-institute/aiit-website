import { useEffect, useState } from 'react';
import { COURSES } from '@/data/courses';
import type { Course } from '@/data/types';

/**
 * Learner portal data layer — the single place to connect the backend.
 *
 * The real learner record lives behind login on the AIIT backend, which is
 * not part of this frontend. Everything here is intentionally empty: the
 * portal renders a complete, designed experience from an empty record and
 * grows richer as real data arrives, never fabricating progress, grades,
 * certificates or activity.
 *
 * To connect it: have `loadLearner()` fetch the account and map the response
 * onto `LearnerRecord`. The `useLearner` hook already models the
 * loading / ready / error states.
 */

export type JourneyPhase = 'learn' | 'practice' | 'certify' | 'progress' | 'globalize';

/** One stage inside a single course's path. Only render stages the
 *  course's real curriculum data supports. */
export interface CourseStage {
  label: string;
  /** 'done' | 'active' | 'upcoming' — derived from real lesson state. */
  state: 'done' | 'active' | 'upcoming';
}

export interface NextAction {
  /** Verb-led, e.g. "Resume lesson", "View assignment", "View certificate". */
  label: string;
  href: string;
  /** Short context line, e.g. the lesson or assignment title. */
  context?: string;
}

export interface EnrolledCourse {
  courseId: string;
  /** 0–100, from the backend. */
  progress: number;
  /** Human label for where the learner is, e.g. the current lesson. */
  currentPoint?: string;
  enrolledAt?: string;
  completedAt?: string;
  /** Real curriculum milestones, if the backend exposes them. */
  stages?: CourseStage[];
  nextAction?: NextAction;
}

export interface EarnedCertificate {
  courseId: string;
  /** ISO date the credential was issued. */
  issued: string;
  credentialId: string;
  /** Verify / view URL, if the backend issues one. */
  url?: string;
}

export interface WebinarRegistration {
  id: string;
  title: string;
  startsAt?: string;
  status: 'upcoming' | 'attended' | 'missed';
  joinUrl?: string;
}

export interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  status: 'pending' | 'submitted' | 'graded';
  dueAt?: string;
  grade?: string;
  href?: string;
}

export type NotificationKind = 'course' | 'certificate' | 'assignment' | 'webinar' | 'system';

export interface PortalNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  at: string;
  read: boolean;
  href?: string;
}

export interface LearnerProfile {
  /** First name or full name if the backend provides it; never invented. */
  name?: string;
  email?: string;
  headline?: string;
  location?: string;
  joinedAt?: string;
}

export interface LearnerRecord {
  profile: LearnerProfile;
  enrolled: EnrolledCourse[];
  certificates: EarnedCertificate[];
  webinars: WebinarRegistration[];
  assignments: AssignmentRecord[];
  notifications: PortalNotification[];
}

export const EMPTY_LEARNER: LearnerRecord = {
  profile: {},
  enrolled: [],
  certificates: [],
  webinars: [],
  assignments: [],
  notifications: [],
};

async function fetchLearner(): Promise<LearnerRecord> {
  // return mapResponse(await fetch('/api/me').then((r) => r.json()));
  return EMPTY_LEARNER;
}

let inFlight: Promise<LearnerRecord> | null = null;

/**
 * Fetch the learner record — replace `fetchLearner` with the real backend
 * call. Memoised for the session so every `useLearner()` caller shares one
 * request.
 */
export function loadLearner(): Promise<LearnerRecord> {
  if (!inFlight) inFlight = fetchLearner();
  return inFlight;
}

export type LearnerState =
  | { status: 'loading'; learner: null; error: null }
  | { status: 'ready'; learner: LearnerRecord; error: null }
  | { status: 'error'; learner: null; error: Error };

/**
 * Portal-wide learner state. Components branch on `status` to show the
 * loading, error or ready experience; `ready` still covers a completely
 * empty account, which is a designed state, not a failure.
 */
export function useLearner(): LearnerState {
  const [state, setState] = useState<LearnerState>(
    // The scaffold resolves synchronously, so start ready and avoid a
    // loading flash. A real fetch should start in { status: 'loading' }.
    { status: 'ready', learner: EMPTY_LEARNER, error: null },
  );

  useEffect(() => {
    let alive = true;
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
  }, []);

  return state;
}

/* ---- Derived helpers (pure, data-driven) ---- */

export function courseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

export interface JourneyPhaseState {
  phase: JourneyPhase;
  label: string;
  /** 'complete' | 'active' | 'dormant' — never invented, always derived. */
  state: 'complete' | 'active' | 'dormant';
  /** Optional one-line, real context (e.g. "2 courses in progress"). */
  detail?: string;
}

const PHASE_LABEL: Record<JourneyPhase, string> = {
  learn: 'Learn',
  practice: 'Practice',
  certify: 'Certify',
  progress: 'Progress',
  globalize: 'Globalize',
};

/**
 * Maps the real learner record onto AIIT's five-phase journey.
 * An empty record yields five dormant phases — a calm starting line,
 * not a failure state.
 */
export function journeyPhases(learner: LearnerRecord): JourneyPhaseState[] {
  const active = learner.enrolled.filter((e) => e.progress < 100);
  const completed = learner.enrolled.filter((e) => e.progress >= 100);
  const hasCerts = learner.certificates.length > 0;
  const anyPractice = learner.enrolled.some(
    (e) => e.progress >= 40 && e.progress < 100,
  );

  const phase = (
    p: JourneyPhase,
    state: JourneyPhaseState['state'],
    detail?: string,
  ): JourneyPhaseState => ({ phase: p, label: PHASE_LABEL[p], state, detail });

  return [
    phase(
      'learn',
      active.length > 0 ? 'active' : learner.enrolled.length > 0 ? 'complete' : 'dormant',
      active.length > 0 ? countLabel(active.length, 'course') + ' in progress' : undefined,
    ),
    phase(
      'practice',
      anyPractice ? 'active' : completed.length > 0 ? 'complete' : 'dormant',
    ),
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
  const active = learner.enrolled
    .filter((e) => e.progress < 100)
    .sort((a, b) => b.progress - a.progress);
  if (active[0]?.nextAction) return active[0].nextAction;

  const pendingAssignment = learner.assignments.find((a) => a.status === 'pending');
  if (pendingAssignment) {
    return {
      label: 'View assignment',
      href: pendingAssignment.href ?? '/portal/assignments',
      context: pendingAssignment.title,
    };
  }

  if (active[0]) {
    const course = courseById(active[0].courseId);
    return {
      label: 'Continue course',
      href: course ? `/courses/${course.slug}` : '/portal/courses',
      context: course?.title,
    };
  }
  return null;
}

export function isEmptyLearner(learner: LearnerRecord): boolean {
  return (
    learner.enrolled.length === 0 &&
    learner.certificates.length === 0 &&
    learner.webinars.length === 0 &&
    learner.assignments.length === 0
  );
}

export function greetingName(learner: LearnerRecord): string | null {
  const n = learner.profile.name?.trim();
  return n ? n.split(/\s+/)[0] : null;
}
