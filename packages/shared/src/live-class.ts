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

/**
 * GET/PUT /live-classes/:id/whiteboard -- the board's shape (strokes,
 * background, who currently holds the pen) is owned entirely by the web
 * client; the API stores and returns it opaquely.
 */
export interface LiveClassWhiteboard {
  state: unknown;
}

/** GET/POST/DELETE /live-classes/:id/resources -- links or notes the host pins for everyone during class. */
export interface PinnedResource {
  id: string;
  title: string;
  url: string;
  note: string | null;
  pinnedAt: string;
}

/**
 * The host's current quick-check poll. Raw votes are never sent to the
 * client -- `results` is a server-computed tally (visible to the host while
 * open, to everyone once closed) and `myVote` is only the caller's own
 * choice, so a student never sees how anyone else voted.
 */
export interface PollOption {
  id: string;
  text: string;
}

export interface LiveClassPoll {
  id: string;
  question: string;
  options: PollOption[];
  status: 'open' | 'closed';
  createdAt: string;
  closedAt: string | null;
  results: Record<string, number> | null;
  myVote: string | null;
}

/**
 * GET /live-classes/:id/breakouts -- each breakout room is a genuinely
 * separate LiveKit room; moving into one means reconnecting there (see
 * POST .../breakouts/join), not just a UI state change.
 */
export interface BreakoutRoomMember {
  id: string;
  name: string | null;
}

export interface BreakoutRoomView {
  id: string;
  name: string;
  members: BreakoutRoomMember[];
}

export interface LiveClassBreakouts {
  rooms: BreakoutRoomView[];
  /** The room the caller is assigned to, or null if they're not assigned (stay in the main room). Always null for the host, who visits rooms rather than being assigned. */
  myRoomId: string | null;
  startedAt: string;
}

/** POST /live-classes/:id/breakouts/join -- everything needed to reconnect into that specific breakout room. */
export interface BreakoutJoin {
  token: string;
  url: string;
  roomId: string;
  roomName: string;
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
