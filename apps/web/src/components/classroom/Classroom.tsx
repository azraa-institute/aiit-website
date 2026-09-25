import { useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useIsMuted,
  useIsSpeaking,
  useParticipants,
  useRoomContext,
  useTrackToggle,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { ConnectionState, DisconnectReason, Track } from 'livekit-client';
import type { LiveClassJoin } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { CameraIcon, ChatIcon, LeaveIcon, MicIcon, PeopleIcon, ShareIcon } from './ClassroomIcons';
import { ChatPanel, PeoplePanel } from './ClassroomPanel';
import { displayName, participantRole } from './participant';

/** Tiles beside the main stage. Everyone is still in the People list; this just keeps a big class from decoding dozens of videos. */
const MAX_STRIP_TILES = 11;

export interface ClassroomProps {
  join: LiveClassJoin;
  startWithCamera: boolean;
  startWithMic: boolean;
  onDisconnected: (reason?: DisconnectReason) => void;
}

/** The whole in-class experience, mounted only after the API has issued a join token. */
export function Classroom({ join, startWithCamera, startWithMic, onDisconnected }: ClassroomProps) {
  const [deviceNotice, setDeviceNotice] = useState<string>();
  return (
    <LiveKitRoom
      className="classroom"
      token={join.token}
      serverUrl={join.url}
      connect
      audio={startWithMic}
      video={startWithCamera}
      options={{ adaptiveStream: true, dynacast: true }}
      onDisconnected={onDisconnected}
      onMediaDeviceFailure={() =>
        setDeviceNotice('We could not use your camera or microphone. Check your browser permissions, then use the buttons below.')
      }
    >
      <ClassroomInner join={join} deviceNotice={deviceNotice} dismissNotice={() => setDeviceNotice(undefined)} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function ClassroomInner({
  join,
  deviceNotice,
  dismissNotice,
}: {
  join: LiveClassJoin;
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
  const [panel, setPanel] = useState<'chat' | 'people' | null>(null);

  const isHost = join.role === 'host';
  const screen = tracks.find((t) => t.source === Track.Source.ScreenShare && isTrackReference(t));
  const cameras = tracks.filter((t) => t.source === Track.Source.Camera);
  const hostCamera = cameras.find((t) => participantRole(t.participant) === 'host');
  const stage: TrackReferenceOrPlaceholder | undefined = screen ?? hostCamera ?? cameras[0];
  const strip = tracks
    .filter((t) => t !== stage && t.source === Track.Source.Camera)
    .sort((a, b) => Number(b.participant.isLocal) - Number(a.participant.isLocal));
  const hidden = Math.max(0, strip.length - MAX_STRIP_TILES);

  return (
    <div className={cn('classroom__inner', panel && 'has-panel')}>
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

      <div className="classroom__main">
        <section className="classroom__stage" aria-label="Main video">
          {stage ? (
            <Tile trackRef={stage} large isScreen={stage === screen} />
          ) : (
            <div className="classroom__waiting">
              <p>{isHost ? 'You are the only one here so far.' : 'Waiting for the instructor to appear…'}</p>
            </div>
          )}
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
        <aside className="classroom-panel" aria-label={panel === 'chat' ? 'Chat' : 'People'}>
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
            <button type="button" className="classroom-panel__close" onClick={() => setPanel(null)}>
              Close
            </button>
          </div>
          {panel === 'chat' ? (
            <ChatPanel />
          ) : (
            <PeoplePanel liveClassId={join.liveClass.id} canModerate={isHost} />
          )}
        </aside>
      ) : null}

      <Controls join={join} panel={panel} setPanel={setPanel} />
      <StartAudio label="Click to hear the class" className="classroom__start-audio" />
    </div>
  );
}

function Tile({ trackRef, large, isScreen }: { trackRef: TrackReferenceOrPlaceholder; large?: boolean; isScreen?: boolean }) {
  const { participant } = trackRef;
  const speaking = useIsSpeaking(participant);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const camMuted = useIsMuted(trackRef);
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
}: {
  join: LiveClassJoin;
  panel: 'chat' | 'people' | null;
  setPanel: (p: 'chat' | 'people' | null) => void;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });
  const share = useTrackToggle({ source: Track.Source.ScreenShare });
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string>();
  const isHost = join.role === 'host';
  const canShare = isHost && typeof navigator.mediaDevices?.getDisplayMedia === 'function';

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
        className={cn('controls__btn', !mic.enabled && 'is-off')}
        aria-pressed={mic.enabled}
        disabled={mic.pending}
        onClick={() => mic.toggle()}
      >
        <MicIcon off={!mic.enabled} />
        <span>{mic.enabled ? 'Mute' : 'Unmute'}</span>
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
