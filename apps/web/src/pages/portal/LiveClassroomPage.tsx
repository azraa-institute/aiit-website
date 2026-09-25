import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DisconnectReason } from 'livekit-client';
import type { LiveClassJoin, LiveClassSummary } from '@aiit/shared';
import { Seo } from '@/lib/Seo';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/layout/Logo';
import { Classroom } from '@/components/classroom/Classroom';
import { useMe, roleHome } from '@/lib/me';
import { formatClassDay, formatClassRange, useLiveClasses } from './liveClassData';
import '@/components/classroom/classroom.css';

type Phase = 'lobby' | 'joining' | 'live' | 'left' | 'ended' | 'removed' | 'dropped';

/** How often the lobby re-checks whether the instructor has started the class. */
const LOBBY_POLL_MS = 5_000;

/** Where 'back' goes: a student's timetable, or the instructor / admin's own portal. */
function useBackTarget(): { to: string; label: string } {
  const me = useMe();
  if (me.status === 'ready' && me.me.role !== 'learner') {
    return { to: roleHome(me.me.role), label: 'Back to your portal' };
  }
  return { to: '/portal/schedule', label: 'Back to your timetable' };
}

function ClassroomHeader({ liveClass, live }: { liveClass?: LiveClassSummary; live?: boolean }) {
  const back = useBackTarget();
  return (
    <header className="classroom-head">
      <Link to={back.to} className="classroom-head__brand" aria-label={back.label}>
        <Logo variant="light" className="classroom-head__logo" />
      </Link>
      <div className="classroom-head__title">
        <p className="classroom-head__eyebrow">AIIT Live Classroom</p>
        <h1>{liveClass?.title ?? 'Live class'}</h1>
        {liveClass ? <p className="classroom-head__course">{liveClass.courseTitle}</p> : null}
      </div>
      {live ? <span className="classroom-head__live">Live</span> : null}
    </header>
  );
}

export default function LiveClassroomPage() {
  const { id } = useParams();
  const back = useBackTarget();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [joined, setJoined] = useState<LiveClassJoin>();
  const [error, setError] = useState<string>();
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState<boolean | undefined>(undefined);
  const state = useLiveClasses(phase === 'lobby' ? LOBBY_POLL_MS : 0);

  const liveClass =
    joined?.liveClass ?? (state.status === 'ready' ? state.classes.find((c) => c.id === id) : undefined);
  // Learners start muted (a classroom of open mics is chaos); the instructor starts unmuted.
  const wantMic = mic ?? liveClass?.role === 'host';

  async function handleJoin() {
    if (!id) return;
    setError(undefined);
    setPhase('joining');
    try {
      const res = await apiFetch<LiveClassJoin>(`/live-classes/${encodeURIComponent(id)}/join`, { method: 'POST' });
      setJoined(res);
      setPhase('live');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join this class.');
      setPhase('lobby');
    }
  }

  function handleDisconnected(reason?: DisconnectReason) {
    if (reason === DisconnectReason.CLIENT_INITIATED) setPhase('left');
    else if (reason === DisconnectReason.ROOM_DELETED) setPhase('ended');
    else if (reason === DisconnectReason.PARTICIPANT_REMOVED) setPhase('removed');
    else if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
      setError('You joined this class from another tab or device, so this one was disconnected.');
      setPhase('dropped');
    } else setPhase('dropped');
  }

  if (phase === 'live' && joined) {
    return (
      <div className="classroom-page">
        <Seo title={joined.liveClass.title} path={`/classroom/${joined.liveClass.id}`} noindex />
        <ClassroomHeader liveClass={joined.liveClass} live />
        <Classroom join={joined} startWithCamera={camera} startWithMic={wantMic} onDisconnected={handleDisconnected} />
      </div>
    );
  }

  const closed = phase === 'left' || phase === 'ended' || phase === 'removed' || phase === 'dropped';
  const joinState = liveClass?.joinState;

  return (
    <div className="classroom-page">
      <Seo title={liveClass?.title ?? 'Live class'} path={`/classroom/${id ?? ''}`} noindex />
      <ClassroomHeader liveClass={liveClass} />
      <main className="lobby">
        <div className="lobby__card">
          {state.status === 'loading' && phase === 'lobby' ? (
            <p className="lobby__note">Loading class details…</p>
          ) : !liveClass ? (
            <>
              <h2 className="lobby__title">We couldn&apos;t find this class</h2>
              <p className="lobby__note">
                It may have been removed, or it belongs to a course you are not enrolled in.
              </p>
              <Link to={back.to} className="lobby__btn">
                {back.label}
              </Link>
            </>
          ) : closed ? (
            <>
              <h2 className="lobby__title">
                {phase === 'ended' && 'The class has ended'}
                {phase === 'left' && 'You left the class'}
                {phase === 'removed' && 'You were removed from the class'}
                {phase === 'dropped' && 'You were disconnected'}
              </h2>
              <p className="lobby__note">
                {phase === 'ended' && 'Your instructor closed the classroom. Thank you for joining.'}
                {phase === 'left' && 'You can rejoin while the class is still running.'}
                {phase === 'removed' && 'The instructor removed you from this session. Contact the AIIT team if you think this was a mistake.'}
                {phase === 'dropped' && (error ?? 'Your connection to the classroom was lost. You can try to rejoin.')}
              </p>
              <div className="lobby__actions">
                {phase !== 'ended' && phase !== 'removed' ? (
                  <button type="button" className="lobby__btn" onClick={() => setPhase('lobby')}>
                    Rejoin
                  </button>
                ) : null}
                <Link to={back.to} className="lobby__btn lobby__btn--ghost">
                  {back.label}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="lobby__when">
                {formatClassDay(liveClass.startsAt)} · {formatClassRange(liveClass.startsAt, liveClass.endsAt)}
              </p>
              <h2 className="lobby__title">{liveClass.title}</h2>
              <p className="lobby__note">
                {liveClass.courseTitle}
                {liveClass.hostName ? ` · with ${liveClass.hostName}` : ''}
              </p>

              {joinState === 'open' || joinState === 'waiting_for_host' ? (
                <fieldset className="lobby__devices">
                  <legend className="visually-hidden">Join settings</legend>
                  <label>
                    <input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} />
                    <span>Camera on</span>
                  </label>
                  <label>
                    <input type="checkbox" checked={wantMic} onChange={(e) => setMic(e.target.checked)} />
                    <span>Microphone on</span>
                  </label>
                </fieldset>
              ) : null}

              {error ? (
                <p className="lobby__error" role="alert">
                  {error}
                </p>
              ) : null}

              {joinState === 'open' ? (
                <button type="button" className="lobby__btn" disabled={phase === 'joining'} onClick={handleJoin}>
                  {phase === 'joining'
                    ? 'Connecting…'
                    : liveClass.role === 'host'
                      ? liveClass.status === 'live'
                        ? 'Rejoin class'
                        : 'Start class'
                      : 'Join class'}
                </button>
              ) : null}
              {joinState === 'waiting_for_host' ? (
                <>
                  <button type="button" className="lobby__btn" disabled>
                    Waiting for your instructor…
                  </button>
                  <p className="lobby__note lobby__note--small">
                    You&apos;re in the waiting room. This page updates on its own the moment the class starts.
                  </p>
                </>
              ) : null}
              {joinState === 'not_open' ? (
                <p className={cn('lobby__note', 'lobby__note--small')}>
                  The classroom opens shortly before the class begins. This page will update on its own.
                </p>
              ) : null}
              {joinState === 'ended' || joinState === 'cancelled' ? (
                <>
                  <p className="lobby__note">
                    {joinState === 'cancelled' ? 'This class has been cancelled.' : 'This class has ended.'}
                  </p>
                  <Link to={back.to} className="lobby__btn lobby__btn--ghost">
                    {back.label}
                  </Link>
                </>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
