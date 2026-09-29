import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LiveClassBreakouts, LiveClassJoin } from '@aiit/shared';
import { apiFetch } from '@/lib/api';

/** Host-only. Learners get their assignment via the banner in ClassroomInner, not this panel. */
export function BreakoutsPanel({
  join,
  breakouts,
  onBreakoutsChanged,
  inBreakout,
  onSwitchToMain,
  onSwitchToBreakout,
}: {
  join: LiveClassJoin;
  breakouts: LiveClassBreakouts | null;
  onBreakoutsChanged: (next: LiveClassBreakouts | null) => void;
  inBreakout: boolean;
  onSwitchToMain: () => void;
  onSwitchToBreakout: (roomId: string) => void;
}) {
  const [roomCount, setRoomCount] = useState(3);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy('start');
    setError(undefined);
    try {
      const next = await apiFetch<LiveClassBreakouts>(`/live-classes/${join.liveClass.id}/breakouts`, {
        method: 'POST',
        body: JSON.stringify({ roomCount }),
      });
      onBreakoutsChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start breakout rooms.');
    } finally {
      setBusy(null);
    }
  }

  async function move(studentId: string, roomId: string) {
    setBusy(studentId);
    setError(undefined);
    try {
      const next = await apiFetch<LiveClassBreakouts>(`/live-classes/${join.liveClass.id}/breakouts/move`, {
        method: 'POST',
        body: JSON.stringify({ studentId, roomId: roomId || undefined }),
      });
      onBreakoutsChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move that student.');
    } finally {
      setBusy(null);
    }
  }

  async function close() {
    if (!confirm('Close breakout rooms and bring everyone back to the main room?')) return;
    setBusy('close');
    setError(undefined);
    try {
      await apiFetch(`/live-classes/${join.liveClass.id}/breakouts/close`, { method: 'POST' });
      onBreakoutsChanged(null);
      if (inBreakout) onSwitchToMain();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close breakout rooms.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="classroom-panel__body breakouts">
      {error ? (
        <p className="breakouts__error" role="alert">
          {error}
        </p>
      ) : null}

      {!breakouts ? (
        <form className="breakouts__form" onSubmit={start}>
          <label>
            Number of rooms
            <input
              type="number"
              min={2}
              max={10}
              value={roomCount}
              onChange={(e) => setRoomCount(Math.max(2, Math.min(10, Number(e.target.value) || 2)))}
            />
          </label>
          <p className="breakouts__note">Everyone currently in the main room will be split evenly. You can move people afterward.</p>
          <button type="submit" disabled={busy === 'start'}>
            {busy === 'start' ? 'Starting…' : 'Start breakout rooms'}
          </button>
        </form>
      ) : (
        <>
          <ul className="breakouts__rooms" role="list">
            {breakouts.rooms.map((room) => (
              <li key={room.id}>
                <div className="breakouts__room-head">
                  <span className="breakouts__room-name">
                    {room.name} <span className="breakouts__room-count">({room.members.length})</span>
                  </span>
                  <button type="button" onClick={() => onSwitchToBreakout(room.id)}>
                    Visit
                  </button>
                </div>
                {room.members.length === 0 ? (
                  <p className="breakouts__empty">No one assigned.</p>
                ) : (
                  <ul className="breakouts__members" role="list">
                    {room.members.map((m) => (
                      <li key={m.id}>
                        <span>{m.name ?? 'Student'}</span>
                        <select
                          value={room.id}
                          disabled={busy === m.id}
                          onChange={(e) => move(m.id, e.target.value)}
                          aria-label={`Move ${m.name ?? 'this student'}`}
                        >
                          {breakouts.rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                          <option value="">Main room</option>
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {inBreakout ? (
            <button type="button" className="breakouts__return" onClick={onSwitchToMain}>
              Return to main room
            </button>
          ) : null}
          <button type="button" className="breakouts__close" disabled={busy === 'close'} onClick={close}>
            {busy === 'close' ? 'Closing…' : 'Close breakout rooms'}
          </button>
        </>
      )}
    </div>
  );
}
