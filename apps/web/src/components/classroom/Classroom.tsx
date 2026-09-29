import { useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useDataChannel,
  useIsMuted,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTrackToggle,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { ConnectionState, DisconnectReason, Track } from 'livekit-client';
import type { BreakoutJoin, LiveClassBreakouts, LiveClassJoin } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { RoomConnection } from './breakouts';
import { BreakoutsPanel } from './BreakoutsPanel';
import {
  BreakoutIcon,
  CameraIcon,
  ChatIcon,
  HandIcon,
  LeaveIcon,
  MicIcon,
  PeopleIcon,
  PinIcon,
  PollIcon,
  ShareIcon,
  WhiteboardIcon,
} from './ClassroomIcons';
import { ChatPanel, isMicLocked, PeoplePanel } from './ClassroomPanel';
import { HAND_RAISED_ATTR, handRaisedAtMs, isHandRaised, useIsHandRaised } from './handRaise';
import { displayName, participantRole } from './participant';
import { PollPanel } from './PollPanel';
import { newReactionId, REACTION_EMOJIS, type FloatingReaction } from './reactions';
import { ResourcesPanel } from './ResourcesPanel';
import { WhiteboardPanel } from './Whiteboard';

/** Tiles beside the main stage. Everyone is still in the People list; this just keeps a big class from decoding dozens of videos. */
const MAX_STRIP_TILES = 11;

export interface ClassroomProps {
  join: LiveClassJoin;
  startWithCamera: boolean;
  startWithMic: boolean;
  onDisconnected: (reason?: DisconnectReason) => void;
}

/**
 * The whole in-class experience, mounted only after the API has issued a
 * join token. Each breakout room is a genuinely separate LiveKit room, so
 * "moving" into one means fully reconnecting: `<LiveKitRoom>` is remounted
 * (keyed on roomLabel) with a fresh token/url rather than trying to swap
 * rooms on a live connection. A remount fires its own onDisconnected as the
 * old connection tears down -- switchingRef swallows exactly that one event
 * so the page doesn't mistake an intentional room switch for the caller
 * leaving the class.
 */
export function Classroom({ join, startWithCamera, startWithMic, onDisconnected }: ClassroomProps) {
  const [deviceNotice, setDeviceNotice] = useState<string>();
  const [connection, setConnection] = useState<RoomConnection>({ token: join.token, url: join.url, roomLabel: 'main' });
  const switchingRef = useRef(false);

  async function switchToMain() {
    const fresh = await apiFetch<LiveClassJoin>(`/live-classes/${join.liveClass.id}/join`, { method: 'POST' });
    switchingRef.current = true;
    setConnection({ token: fresh.token, url: fresh.url, roomLabel: 'main' });
  }

  async function switchToBreakout(roomId: string) {
    const bj = await apiFetch<BreakoutJoin>(`/live-classes/${join.liveClass.id}/breakouts/join`, {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    });
    switchingRef.current = true;
    setConnection({ token: bj.token, url: bj.url, roomLabel: bj.roomId });
  }

  function handleDisconnected(reason?: DisconnectReason) {
    if (switchingRef.current) {
      switchingRef.current = false;
      return;
    }
    onDisconnected(reason);
  }

  return (
    <LiveKitRoom
      key={connection.roomLabel}
      className="classroom"
      token={connection.token}
      serverUrl={connection.url}
      connect
      audio={startWithMic}
      video={startWithCamera}
      options={{ adaptiveStream: true, dynacast: true }}
      onDisconnected={handleDisconnected}
      onMediaDeviceFailure={() =>
        setDeviceNotice('We could not use your camera or microphone. Check your browser permissions, then use the buttons below.')
      }
    >
      <ClassroomInner
        join={join}
        inBreakout={connection.roomLabel !== 'main'}
        onSwitchToMain={switchToMain}
        onSwitchToBreakout={switchToBreakout}
        deviceNotice={deviceNotice}
        dismissNotice={() => setDeviceNotice(undefined)}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function ClassroomInner({
  join,
  inBreakout,
  onSwitchToMain,
  onSwitchToBreakout,
  deviceNotice,
  dismissNotice,
}: {
  join: LiveClassJoin;
  inBreakout: boolean;
  onSwitchToMain: () => void;
  onSwitchToBreakout: (roomId: string) => void;
  deviceNotice?: string;
  dismissNotice: () => void;
}) {
  const connection = useConnectionState();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const [panel, setPanel] = useState<'chat' | 'people' | 'whiteboard' | 'resources' | 'poll' | 'breakouts' | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [breakouts, setBreakouts] = useState<LiveClassBreakouts | null>(null);
  const [wbUnseen, setWbUnseen] = useState(false);
  const panelRef = useRef(panel);
  panelRef.current = panel;

  // Seeds "there's something to look at" for anyone who joins after the
  // board already has content; wb-notify (below) covers activity from here on.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ state: unknown }>(`/live-classes/${join.liveClass.id}/whiteboard`)
      .then((res) => {
        if (!cancelled && res.state) setWbUnseen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [join.liveClass.id]);

  useEffect(() => {
    if (panel === 'whiteboard') setWbUnseen(false);
  }, [panel]);

  useDataChannel('wb-notify', () => {
    if (panelRef.current !== 'whiteboard') setWbUnseen(true);
  });

  const { send: sendReaction } = useDataChannel('reaction', (msg) => {
    let payload: { emoji?: string };
    try {
      payload = JSON.parse(new TextDecoder().decode(msg.payload)) as { emoji?: string };
    } catch {
      return;
    }
    if (!payload.emoji) return;
    addReaction(payload.emoji, msg.from ? displayName(msg.from) : 'Someone');
  });

  function addReaction(emoji: string, name: string) {
    const id = newReactionId();
    setReactions((r) => [...r, { id, emoji, name }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 3200);
  }

  async function react(emoji: string) {
    addReaction(emoji, 'You');
    try {
      await sendReaction(new TextEncoder().encode(JSON.stringify({ emoji })), { reliable: false });
    } catch {
      // Ephemeral and best-effort -- a dropped reaction isn't worth surfacing an error for.
    }
  }

  // Breakout assignments can't be pushed to a client sitting in a *different*
  // LiveKit room (its data channel is scoped to whichever room it's
  // connected to), so this is polled from wherever the caller currently is.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await apiFetch<LiveClassBreakouts | null>(`/live-classes/${join.liveClass.id}/breakouts`);
        if (!cancelled) setBreakouts(res);
      } catch {
        // Transient -- try again next tick.
      }
    }
    void poll();
    const interval = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [join.liveClass.id]);

  const isHost = join.role === 'host';
  const myBreakoutRoom = breakouts?.myRoomId ? breakouts.rooms.find((r) => r.id === breakouts.myRoomId) : undefined;
  const needsToMoveToBreakout = !isHost && !inBreakout && Boolean(breakouts?.myRoomId);

  useEffect(() => {
    if (inBreakout && (panel === 'whiteboard' || panel === 'resources' || panel === 'poll')) setPanel(null);
  }, [inBreakout, panel]);

  const screen = tracks.find((t) => t.source === Track.Source.ScreenShare && isTrackReference(t));
  const cameras = tracks.filter((t) => t.source === Track.Source.Camera);
  const hostCamera = cameras.find((t) => participantRole(t.participant) === 'host');
  const stage: TrackReferenceOrPlaceholder | undefined = screen ?? hostCamera ?? cameras[0];
  const strip = tracks
    .filter((t) => t !== stage && t.source === Track.Source.Camera)
    .sort((a, b) => Number(b.participant.isLocal) - Number(a.participant.isLocal));
  const hidden = Math.max(0, strip.length - MAX_STRIP_TILES);

  return (
    <div className={cn('classroom__inner', panel && 'has-panel', panel === 'whiteboard' && 'has-wide-panel')}>
      {connection === ConnectionState.Reconnecting || connection === ConnectionState.SignalReconnecting ? (
        <p className="classroom__banner" role="status">
          Connection lost — trying to reconnect…
        </p>
      ) : null}
      {connection === ConnectionState.Connecting ? (
        <p className="classroom__banner" role="status">
          Connecting to the classroom…
        </p>
      ) : null}
      {deviceNotice ? (
        <p className="classroom__banner classroom__banner--warn" role="alert">
          {deviceNotice}{' '}
          <button type="button" onClick={dismissNotice}>
            Dismiss
          </button>
        </p>
      ) : null}
      {inBreakout ? (
        <p className="classroom__banner classroom__banner--action" role="status">
          You're in {myBreakoutRoom?.name ?? 'a breakout room'}.{' '}
          <button type="button" onClick={onSwitchToMain}>
            Return to main room
          </button>
        </p>
      ) : needsToMoveToBreakout && breakouts?.myRoomId ? (
        <p className="classroom__banner classroom__banner--action" role="status">
          You've been assigned to {myBreakoutRoom?.name ?? 'a breakout room'}.{' '}
          <button type="button" onClick={() => onSwitchToBreakout(breakouts.myRoomId as string)}>
            Join breakout room
          </button>
        </p>
      ) : null}

      <div className="classroom__main">
        <section className="classroom__stage" aria-label="Main video">
          {stage ? (
            <Tile trackRef={stage} large isScreen={stage === screen} />
          ) : (
            <div className="classroom__waiting">
              <p>{isHost ? 'You are the only one here so far.' : 'Waiting for the instructor to appear…'}</p>
            </div>
          )}
          {reactions.length > 0 ? (
            <div className="classroom__reactions" aria-live="polite">
              {reactions.map((r) => (
                <span key={r.id} className="classroom__reaction" title={r.name}>
                  {r.emoji}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {strip.length > 0 ? (
          <ul className="classroom__strip" role="list" aria-label="Participants">
            {strip.slice(0, MAX_STRIP_TILES).map((t) => (
              <li key={t.participant.identity}>
                <Tile trackRef={t} />
              </li>
            ))}
            {hidden > 0 ? (
              <li className="classroom__more">
                <button type="button" onClick={() => setPanel('people')}>
                  +{hidden} more
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {panel ? (
        <aside
          className="classroom-panel"
          aria-label={
            panel === 'chat'
              ? 'Chat'
              : panel === 'people'
                ? 'People'
                : panel === 'whiteboard'
                  ? 'Whiteboard'
                  : panel === 'resources'
                    ? 'Resources'
                    : panel === 'poll'
                      ? 'Poll'
                      : 'Breakout rooms'
          }
        >
          <div className="classroom-panel__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={panel === 'chat'}
              className={cn(panel === 'chat' && 'is-active')}
              onClick={() => setPanel('chat')}
            >
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === 'people'}
              className={cn(panel === 'people' && 'is-active')}
              onClick={() => setPanel('people')}
            >
              People
            </button>
            {!inBreakout ? (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'whiteboard'}
                  className={cn(panel === 'whiteboard' && 'is-active')}
                  onClick={() => setPanel('whiteboard')}
                >
                  Whiteboard
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'resources'}
                  className={cn(panel === 'resources' && 'is-active')}
                  onClick={() => setPanel('resources')}
                >
                  Resources
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'poll'}
                  className={cn(panel === 'poll' && 'is-active')}
                  onClick={() => setPanel('poll')}
                >
                  Poll
                </button>
              </>
            ) : null}
            {isHost ? (
              <button
                type="button"
                role="tab"
                aria-selected={panel === 'breakouts'}
                className={cn(panel === 'breakouts' && 'is-active')}
                onClick={() => setPanel('breakouts')}
              >
                Breakouts
              </button>
            ) : null}
            <button type="button" className="classroom-panel__close" onClick={() => setPanel(null)}>
              Close
            </button>
          </div>
          {panel === 'chat' ? (
            <ChatPanel />
          ) : panel === 'people' ? (
            <PeoplePanel liveClassId={join.liveClass.id} canModerate={isHost} />
          ) : panel === 'whiteboard' && !inBreakout ? (
            <WhiteboardPanel join={join} />
          ) : panel === 'resources' && !inBreakout ? (
            <ResourcesPanel join={join} />
          ) : panel === 'poll' && !inBreakout ? (
            <PollPanel join={join} />
          ) : panel === 'breakouts' && isHost ? (
            <BreakoutsPanel
              join={join}
              breakouts={breakouts}
              onBreakoutsChanged={setBreakouts}
              inBreakout={inBreakout}
              onSwitchToMain={onSwitchToMain}
              onSwitchToBreakout={onSwitchToBreakout}
            />
          ) : (
            <p className="classroom-panel__note">Not available while you're in a breakout room.</p>
          )}
        </aside>
      ) : null}

      <Controls join={join} panel={panel} setPanel={setPanel} onReact={react} inBreakout={inBreakout} wbUnseen={wbUnseen} />
      <StartAudio label="Click to hear the class" className="classroom__start-audio" />
    </div>
  );
}

function Tile({ trackRef, large, isScreen }: { trackRef: TrackReferenceOrPlaceholder; large?: boolean; isScreen?: boolean }) {
  const { participant } = trackRef;
  const speaking = useIsSpeaking(participant);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const camMuted = useIsMuted(trackRef);
  const handRaised = useIsHandRaised(participant);
  const showVideo = isTrackReference(trackRef) && (isScreen || !camMuted);
  const name = displayName(participant);
  const role = participantRole(participant);

  return (
    <figure className={cn('tile', large && 'tile--large', speaking && 'is-speaking', isScreen && 'tile--screen')}>
      {showVideo ? (
        <VideoTrack trackRef={trackRef} className="tile__video" />
      ) : (
        <div className="tile__avatar" aria-hidden="true">
          <span>{name.slice(0, 1).toUpperCase()}</span>
        </div>
      )}
      {handRaised && !isScreen ? (
        <span className="tile__hand" title={`${name} raised their hand`}>
          <HandIcon />
        </span>
      ) : null}
      <figcaption className="tile__label">
        {micMuted && !isScreen ? (
          <span className="tile__muted" title="Microphone off">
            <MicIcon off />
          </span>
        ) : null}
        <span className="tile__name">
          {isScreen ? `${name} — screen` : name}
          {participant.isLocal ? ' (you)' : ''}
        </span>
        {role === 'host' && !isScreen ? <span className="tile__role">Instructor</span> : null}
      </figcaption>
    </figure>
  );
}

function Controls({
  join,
  panel,
  setPanel,
  onReact,
  inBreakout,
  wbUnseen,
}: {
  join: LiveClassJoin;
  panel: 'chat' | 'people' | 'whiteboard' | 'resources' | 'poll' | 'breakouts' | null;
  setPanel: (p: 'chat' | 'people' | 'whiteboard' | 'resources' | 'poll' | 'breakouts' | null) => void;
  onReact: (emoji: string) => void;
  inBreakout: boolean;
  wbUnseen: boolean;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });
  const share = useTrackToggle({ source: Track.Source.ScreenShare });
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string>();
  const [handsOpen, setHandsOpen] = useState(false);
  const [raisingHand, setRaisingHand] = useState(false);
  const [reactOpen, setReactOpen] = useState(false);
  const isHost = join.role === 'host';
  const canShare = isHost && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  const micLocked = isMicLocked(localParticipant);
  const handRaised = useIsHandRaised(localParticipant);
  const raisedHands = participants
    .filter((p) => p !== localParticipant && isHandRaised(p))
    .sort((a, b) => handRaisedAtMs(a) - handRaisedAtMs(b));

  const { send: sendHandAck } = useDataChannel('hand-ack', (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload)) as { identity?: string };
      if (payload.identity === localParticipant.identity) {
        void localParticipant.setAttributes({ [HAND_RAISED_ATTR]: '' });
      }
    } catch {
      // Malformed payload -- ignore.
    }
  });

  async function toggleHand() {
    setRaisingHand(true);
    try {
      await localParticipant.setAttributes({ [HAND_RAISED_ATTR]: handRaised ? '' : new Date().toISOString() });
    } finally {
      setRaisingHand(false);
    }
  }

  async function acknowledgeHand(identity: string) {
    await sendHandAck(new TextEncoder().encode(JSON.stringify({ identity })), { reliable: true });
  }

  async function endForEveryone() {
    setEnding(true);
    setEndError(undefined);
    try {
      await apiFetch(`/live-classes/${join.liveClass.id}/end`, { method: 'POST' });
      await room.disconnect();
    } catch (err) {
      setEndError(err instanceof Error ? err.message : 'Could not end the class.');
      setEnding(false);
    }
  }

  return (
    <div className="controls" role="toolbar" aria-label="Class controls">
      <button
        type="button"
        className={cn('controls__btn', (!mic.enabled || micLocked) && 'is-off')}
        aria-pressed={mic.enabled}
        disabled={mic.pending || micLocked}
        title={micLocked ? 'The instructor has muted your microphone' : undefined}
        onClick={() => mic.toggle()}
      >
        <MicIcon off={!mic.enabled || micLocked} />
        <span>{micLocked ? 'Muted by instructor' : mic.enabled ? 'Mute' : 'Unmute'}</span>
      </button>
      <button
        type="button"
        className={cn('controls__btn', !cam.enabled && 'is-off')}
        aria-pressed={cam.enabled}
        disabled={cam.pending}
        onClick={() => cam.toggle()}
      >
        <CameraIcon off={!cam.enabled} />
        <span>{cam.enabled ? 'Stop video' : 'Start video'}</span>
      </button>
      {canShare ? (
        <button
          type="button"
          className={cn('controls__btn', share.enabled && 'is-on')}
          aria-pressed={share.enabled}
          disabled={share.pending}
          onClick={() => share.toggle()}
        >
          <ShareIcon />
          <span>{share.enabled ? 'Stop sharing' : 'Share screen'}</span>
        </button>
      ) : null}

      {!isHost ? (
        <button
          type="button"
          className={cn('controls__btn', handRaised && 'is-on')}
          aria-pressed={handRaised}
          disabled={raisingHand}
          onClick={() => void toggleHand()}
        >
          <HandIcon />
          <span>{handRaised ? 'Lower hand' : 'Raise hand'}</span>
        </button>
      ) : null}

      {isHost ? (
        <span className="controls__hands-wrap">
          <button
            type="button"
            className={cn('controls__btn', handsOpen && 'is-on')}
            aria-pressed={handsOpen}
            onClick={() => setHandsOpen((v) => !v)}
          >
            <HandIcon />
            <span>Raised hands{raisedHands.length > 0 ? ` (${raisedHands.length})` : ''}</span>
          </button>
          {handsOpen ? (
            <div className="controls__hands" role="menu" aria-label="Raised hands">
              {raisedHands.length === 0 ? (
                <p className="controls__hands-empty">No hands raised.</p>
              ) : (
                <ul role="list">
                  {raisedHands.map((p, i) => (
                    <li key={p.identity}>
                      <span className="controls__hands-rank">{i + 1}</span>
                      <span className="controls__hands-name">{displayName(p)}</span>
                      <button type="button" onClick={() => void acknowledgeHand(p.identity)}>
                        Acknowledge
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </span>
      ) : null}

      <span className="controls__hands-wrap">
        <button
          type="button"
          className={cn('controls__btn', reactOpen && 'is-on')}
          aria-pressed={reactOpen}
          onClick={() => setReactOpen((v) => !v)}
        >
          <span aria-hidden="true">🙂</span>
          <span>React</span>
        </button>
        {reactOpen ? (
          <div className="controls__reactions-menu" role="menu" aria-label="Send a reaction">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setReactOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </span>

      <span className="controls__divider" aria-hidden="true" />

      <button
        type="button"
        className={cn('controls__btn', panel === 'chat' && 'is-on')}
        aria-pressed={panel === 'chat'}
        onClick={() => setPanel(panel === 'chat' ? null : 'chat')}
      >
        <ChatIcon />
        <span>Chat</span>
      </button>
      <button
        type="button"
        className={cn('controls__btn', panel === 'people' && 'is-on')}
        aria-pressed={panel === 'people'}
        onClick={() => setPanel(panel === 'people' ? null : 'people')}
      >
        <PeopleIcon />
        <span>People ({participants.length})</span>
      </button>
      {!inBreakout ? (
        <>
          <button
            type="button"
            className={cn('controls__btn', panel === 'whiteboard' && 'is-on')}
            aria-pressed={panel === 'whiteboard'}
            onClick={() => setPanel(panel === 'whiteboard' ? null : 'whiteboard')}
          >
            <span className="controls__icon-wrap">
              <WhiteboardIcon />
              {wbUnseen ? <span className="controls__dot" aria-hidden="true" /> : null}
            </span>
            <span>Whiteboard{wbUnseen ? ' •' : ''}</span>
          </button>
          <button
            type="button"
            className={cn('controls__btn', panel === 'resources' && 'is-on')}
            aria-pressed={panel === 'resources'}
            onClick={() => setPanel(panel === 'resources' ? null : 'resources')}
          >
            <PinIcon />
            <span>Resources</span>
          </button>
          <button
            type="button"
            className={cn('controls__btn', panel === 'poll' && 'is-on')}
            aria-pressed={panel === 'poll'}
            onClick={() => setPanel(panel === 'poll' ? null : 'poll')}
          >
            <PollIcon />
            <span>Poll</span>
          </button>
        </>
      ) : null}
      {isHost ? (
        <button
          type="button"
          className={cn('controls__btn', panel === 'breakouts' && 'is-on')}
          aria-pressed={panel === 'breakouts'}
          onClick={() => setPanel(panel === 'breakouts' ? null : 'breakouts')}
        >
          <BreakoutIcon />
          <span>Breakouts</span>
        </button>
      ) : null}

      <span className="controls__divider" aria-hidden="true" />

      {isHost && confirmEnd ? (
        <span className="controls__confirm">
          <span>End the class for everyone?</span>
          <button type="button" className="controls__btn is-danger" disabled={ending} onClick={endForEveryone}>
            {ending ? 'Ending…' : 'End class'}
          </button>
          <button type="button" className="controls__btn" disabled={ending} onClick={() => setConfirmEnd(false)}>
            Cancel
          </button>
        </span>
      ) : (
        <>
          <button type="button" className="controls__btn" onClick={() => room.disconnect()}>
            <LeaveIcon />
            <span>Leave</span>
          </button>
          {isHost ? (
            <button type="button" className="controls__btn is-danger" onClick={() => setConfirmEnd(true)}>
              <span>End class</span>
            </button>
          ) : null}
        </>
      )}
      {endError ? (
        <span className="controls__error" role="alert">
          {endError}
        </span>
      ) : null}
    </div>
  );
}
