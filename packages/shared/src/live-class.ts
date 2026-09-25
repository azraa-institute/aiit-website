/** Live classes -- see the "Live classes (LiveKit)" note in apps/api/prisma/schema.prisma. */

export type LiveClassStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

/**
 * What the caller can do with a class right now, computed server-side from the
 * schedule + status so the UI never has to re-derive join windows itself.
 * - not_open: join window hasn't opened yet
 * - waiting_for_host: learner only -- the window is open but the instructor hasn't started the class
 * - open: joinable now (for the host this means "Start class" / "Rejoin")
 * - ended / cancelled: over
 */
export type LiveClassJoinState = 'not_open' | 'waiting_for_host' | 'open' | 'ended' | 'cancelled';

export type LiveClassRole = 'host' | 'learner';

export interface LiveClassSummary {
  id: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  joinOpensAt: string;
  status: LiveClassStatus;
  hostName: string | null;
  /** The caller's relationship to this class: 'host' for its instructor (or any admin), 'learner' otherwise. */
  role: LiveClassRole;
  joinState: LiveClassJoinState;
}

/** POST /live-classes/:id/join -- everything the browser needs to connect; the LiveKit secret never leaves the API. */
export interface LiveClassJoin {
  token: string;
  /** LiveKit server WebSocket URL (wss://...). */
  url: string;
  role: LiveClassRole;
  identity: string;
  displayName: string;
  liveClass: LiveClassSummary;
}

// ---- Admin ----

export interface TimetableSlot {
  id: string;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
  /** "HH:MM", 24h, in the timetable's time zone */
  startTime: string;
  durationMinutes: number;
}

export interface Timetable {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  timeZone: string;
  /** "YYYY-MM-DD" */
  startsOn: string;
  endsOn: string;
  hostUserId: string | null;
  slots: TimetableSlot[];
  classCount: number;
}

export interface AdminLiveClass extends Omit<LiveClassSummary, 'role' | 'joinState'> {
  timetableId: string | null;
  hostUserId: string | null;
  attendeeCount: number;
}

export interface InstructorOption {
  id: string;
  name: string | null;
  email: string | null;
}
