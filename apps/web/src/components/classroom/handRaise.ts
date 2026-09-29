import { useEffect, useState } from 'react';
import type { Participant } from 'livekit-client';

/**
 * Raised-hand state rides on LiveKit's participant attributes (an ISO
 * timestamp, so the host's queue can be ordered oldest-first) rather than a
 * custom data-channel message -- attributes sync automatically to everyone
 * already in the room and to anyone who joins after the hand went up, with
 * no sync-on-join logic of our own to write. Setting the attribute to '' or
 * omitting the key means "not raised".
 */
export const HAND_RAISED_ATTR = 'handRaisedAt';

export function isHandRaised(participant: Participant): boolean {
  return Boolean(participant.attributes?.[HAND_RAISED_ATTR]);
}

export function handRaisedAtMs(participant: Participant): number {
  const value = participant.attributes?.[HAND_RAISED_ATTR];
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Listens directly on the participant's own event emitter rather than
 * leaning on useParticipants()'s room-level subscription -- this way it's
 * correct for the local participant reacting to its own setAttributes call
 * too, not just for how remote participants see each other change.
 */
export function useIsHandRaised(participant: Participant): boolean {
  const [raised, setRaised] = useState(() => isHandRaised(participant));
  useEffect(() => {
    setRaised(isHandRaised(participant));
    const onChange = () => setRaised(isHandRaised(participant));
    participant.on('attributesChanged', onChange);
    return () => {
      participant.off('attributesChanged', onChange);
    };
  }, [participant]);
  return raised;
}
