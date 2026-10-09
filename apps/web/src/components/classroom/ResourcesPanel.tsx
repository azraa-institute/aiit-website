import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useDataChannel } from '@livekit/components-react';
import type { LiveClassJoin, PinnedResource } from '@aiit/shared';
import { apiFetch } from '@/lib/api';

/**
 * Backed by the live class's own pinnedResources column (GET on mount, so a
 * late joiner isn't dependent on a peer still being in the room), kept live
 * for everyone already in the class via a data-channel broadcast of the
 * full list on every host mutation -- simpler than diffing add/remove
 * messages, and cheap since this changes rarely compared to, say, strokes.
 */
export function ResourcesPanel({ join }: { join: LiveClassJoin }) {
  const isHost = join.role === 'host';
  const [resources, setResources] = useState<PinnedResource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    apiFetch<PinnedResource[]>(`/live-classes/${join.liveClass.id}/resources`)
      .then((res) => {
        if (!cancelled) setResources(res);
      })
      .catch(() => setError('Could not load pinned resources.'))
      .finally(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [join.liveClass.id]);

  const { send } = useDataChannel('resources', (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload)) as { resources?: PinnedResource[] };
      if (payload.resources) setResources(payload.resources);
    } catch {
      // Malformed payload -- ignore.
    }
  });

  async function broadcast(list: PinnedResource[]) {
    try {
      await send(new TextEncoder().encode(JSON.stringify({ resources: list })), { reliable: true });
    } catch {
      // Best effort -- everyone still gets the current list next time they open this panel.
    }
  }

  async function pin(e: FormEvent) {
    e.preventDefault();
    setBusy('pin');
    setError(undefined);
    try {
      const next = await apiFetch<PinnedResource[]>(`/live-classes/${join.liveClass.id}/resources`, {
        method: 'POST',
        body: JSON.stringify({ title, url, note: note.trim() || undefined }),
      });
      setResources(next);
      setTitle('');
      setUrl('');
      setNote('');
      void broadcast(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pin that resource.');
    } finally {
      setBusy(null);
    }
  }

  async function unpin(id: string) {
    setBusy(id);
    setError(undefined);
    try {
      const next = await apiFetch<PinnedResource[]>(`/live-classes/${join.liveClass.id}/resources/${id}`, { method: 'DELETE' });
      setResources(next);
      void broadcast(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that resource.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="classroom-panel__body resources">
      {isHost ? (
        <form className="resources__form" onSubmit={pin}>
          <input required placeholder="Title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input required type="url" placeholder="https://…" maxLength={2000} value={url} onChange={(e) => setUrl(e.target.value)} />
          <input placeholder="Note (optional)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" disabled={busy === 'pin'}>
            {busy === 'pin' ? 'Pinning…' : 'Pin'}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="resources__error" role="alert">
          {error}
        </p>
      ) : null}

      {loaded && resources.length === 0 ? (
        <p className="resources__empty">Nothing pinned yet{isHost ? '. Add a link above.' : '.'}</p>
      ) : (
        <ul className="resources__list" role="list">
          {resources.map((r) => (
            <li key={r.id}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
              {r.note ? <p className="resources__note">{r.note}</p> : null}
              {isHost ? (
                <button type="button" disabled={busy === r.id} onClick={() => unpin(r.id)}>
                  {busy === r.id ? '…' : 'Unpin'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
