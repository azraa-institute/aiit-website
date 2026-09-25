import type { Participant } from 'livekit-client';

/** The join token's participant metadata carries the caller's role, set server-side by the API (never by the client). */
export function participantRole(p: Participant): 'host' | 'learner' {
  try {
    return (JSON.parse(p.metadata ?? '{}') as { role?: string }).role === 'host' ? 'host' : 'learner';
  } catch {
    return 'learner';
  }
}

export function displayName(p: Participant): string {
  return p.name || p.identity.slice(0, 8);
}
