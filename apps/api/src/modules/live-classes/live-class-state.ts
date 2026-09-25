import type { LiveClassJoinState, LiveClassRole } from '@aiit/shared';

/** How long after a class's scheduled end it can still be joined / ended (overrun grace). */
export const JOIN_GRACE_MINUTES = 60;

export interface ClassTiming {
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  startsAt: Date;
  endsAt: Date;
  joinOpensMinutes: number;
}

export function joinOpensAt(c: Pick<ClassTiming, 'startsAt' | 'joinOpensMinutes'>): Date {
  return new Date(c.startsAt.getTime() - c.joinOpensMinutes * 60_000);
}

export function joinClosesAt(c: Pick<ClassTiming, 'endsAt'>): Date {
  return new Date(c.endsAt.getTime() + JOIN_GRACE_MINUTES * 60_000);
}

/** Single source of truth for "can this person connect right now" -- used by both the timetable list and the join endpoint. */
export function computeJoinState(c: ClassTiming, role: LiveClassRole, now: Date = new Date()): LiveClassJoinState {
  if (c.status === 'cancelled') return 'cancelled';
  if (c.status === 'ended') return 'ended';
  if (now < joinOpensAt(c)) return 'not_open';
  if (now > joinClosesAt(c)) return 'ended';
  if (role === 'learner' && c.status === 'scheduled') return 'waiting_for_host';
  return 'open';
}
