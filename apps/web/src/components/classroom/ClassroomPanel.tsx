import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useChat, useIsMuted, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { MicIcon } from './ClassroomIcons';
import { displayName, participantRole } from './participant';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel() {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chatMessages.length]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft('');
    await send(text);
  }

  return (
    <div className="classroom-panel__body">
      <ul className="chat" role="list" aria-live="polite" aria-label="Class chat">
        {chatMessages.length === 0 ? (
          <li className="chat__empty">Messages sent here are visible to everyone in this class.</li>
        ) : (
          chatMessages.map((m) => {
            const mine = m.from?.identity === localParticipant.identity;
            return (
              <li key={m.id ?? `${m.timestamp}-${m.message}`} className={cn('chat__msg', mine && 'is-mine')}>
                <p className="chat__meta">
                  <span className="chat__name">{mine ? 'You' : m.from ? displayName(m.from) : 'Someone'}</span>
                  {m.from && participantRole(m.from) === 'host' ? <span className="chat__role">Instructor</span> : null}
                  <time>{formatTime(m.timestamp)}</time>
                </p>
                <p className="chat__text">{m.message}</p>
              </li>
            );
          })
        )}
        <div ref={endRef} />
      </ul>
      <form className="chat__form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="classroom-chat-input">
          Message the class
        </label>
        <input
          id="classroom-chat-input"
          className="chat__input"
          value={draft}
          maxLength={500}
          autoComplete="off"
          placeholder="Message the class"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="chat__send" disabled={!draft.trim() || isSending}>
          Send
        </button>
      </form>
    </div>
  );
}

function PersonRow({
  participant,
  liveClassId,
  canModerate,
}: {
  participant: Participant;
  liveClassId: string;
  canModerate: boolean;
}) {
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const [busy, setBusy] = useState<'mute' | 'remove' | null>(null);
  const [error, setError] = useState<string>();
  const role = participantRole(participant);

  async function moderate(action: 'mute' | 'remove') {
    setBusy(action);
    setError(undefined);
    try {
      await apiFetch(`/live-classes/${liveClassId}/participants/${participant.identity}/${action}`, {
        method: 'POST',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="person">
      <span className="person__mark" aria-hidden="true">
        {displayName(participant).slice(0, 1).toUpperCase()}
      </span>
      <span className="person__name">
        {displayName(participant)}
        {participant.isLocal ? ' (you)' : ''}
        {role === 'host' ? <span className="chat__role">Instructor</span> : null}
      </span>
      <span className={cn('person__mic', micMuted && 'is-off')} title={micMuted ? 'Microphone off' : 'Microphone on'}>
        <MicIcon off={micMuted} />
      </span>
      {canModerate && !participant.isLocal && role !== 'host' ? (
        <span className="person__actions">
          <button type="button" disabled={busy !== null || micMuted} onClick={() => moderate('mute')}>
            {busy === 'mute' ? '…' : 'Mute'}
          </button>
          <button type="button" className="is-danger" disabled={busy !== null} onClick={() => moderate('remove')}>
            {busy === 'remove' ? '…' : 'Remove'}
          </button>
        </span>
      ) : null}
      {error ? (
        <span className="person__error" role="alert">
          {error}
        </span>
      ) : null}
    </li>
  );
}

export function PeoplePanel({ liveClassId, canModerate }: { liveClassId: string; canModerate: boolean }) {
  const participants = useParticipants();
  const sorted = [...participants].sort((a, b) => {
    const rank = (p: Participant) => (participantRole(p) === 'host' ? 0 : p.isLocal ? 1 : 2);
    return rank(a) - rank(b) || displayName(a).localeCompare(displayName(b));
  });
  return (
    <div className="classroom-panel__body">
      <ul className="people" role="list" aria-label="People in this class">
        {sorted.map((p) => (
          <PersonRow key={p.identity} participant={p} liveClassId={liveClassId} canModerate={canModerate} />
        ))}
      </ul>
    </div>
  );
}
