import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useDataChannel } from '@livekit/components-react';
import type { LiveClassJoin, LiveClassPoll } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * Votes are validated and tallied server-side, so the data channel here is
 * only ever a content-free "something changed, refetch" ping -- never the
 * vote itself. That keeps a student's choice from ever being visible to
 * anyone but the API, and keeps the host's live tally trustworthy (a client
 * can't just broadcast a fake result).
 */
export function PollPanel({ join }: { join: LiveClassJoin }) {
  const isHost = join.role === 'host';
  const [poll, setPoll] = useState<LiveClassPoll | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  function load() {
    apiFetch<LiveClassPoll | null>(`/live-classes/${join.liveClass.id}/poll`)
      .then(setPoll)
      .catch(() => setError('Could not load the poll.'))
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [join.liveClass.id]);

  const { send } = useDataChannel('poll', () => load());

  async function ping() {
    try {
      await send(new TextEncoder().encode('{}'), { reliable: true });
    } catch {
      // Best effort -- everyone still gets the current poll next time they open this panel.
    }
  }

  async function launch(e: FormEvent) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError('Add at least two options.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const next = await apiFetch<LiveClassPoll>(`/live-classes/${join.liveClass.id}/poll`, {
        method: 'POST',
        body: JSON.stringify({ question, options: cleanOptions }),
      });
      setPoll(next);
      setQuestion('');
      setOptions(['', '']);
      void ping();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the poll.');
    } finally {
      setBusy(false);
    }
  }

  async function vote(optionId: string) {
    setBusy(true);
    setError(undefined);
    try {
      const next = await apiFetch<LiveClassPoll>(`/live-classes/${join.liveClass.id}/poll/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId }),
      });
      setPoll(next);
      void ping();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your vote.');
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    setBusy(true);
    setError(undefined);
    try {
      const next = await apiFetch<LiveClassPoll>(`/live-classes/${join.liveClass.id}/poll/close`, { method: 'POST' });
      setPoll(next);
      void ping();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the poll.');
    } finally {
      setBusy(false);
    }
  }

  const totalVotes = poll?.results ? Object.values(poll.results).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="classroom-panel__body poll">
      {error ? (
        <p className="poll__error" role="alert">
          {error}
        </p>
      ) : null}

      {loaded && !poll ? (
        <p className="poll__empty">{isHost ? 'No poll running -- start one below.' : 'The instructor has not started a poll.'}</p>
      ) : null}

      {poll ? (
        <div className="poll__current">
          <p className="poll__question">{poll.question}</p>
          <ul className="poll__options" role="list">
            {poll.options.map((o) => {
              const count = poll.results?.[o.id] ?? 0;
              const pct = poll.results && totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const mine = poll.myVote === o.id;
              return (
                <li key={o.id}>
                  {poll.status === 'open' && !isHost ? (
                    <button type="button" className={cn('poll__option-btn', mine && 'is-mine')} disabled={busy} onClick={() => vote(o.id)}>
                      {o.text}
                      {mine ? ' ✓' : ''}
                    </button>
                  ) : (
                    <div className="poll__result">
                      <span className="poll__result-label">
                        {o.text}
                        {mine ? ' (your vote)' : ''}
                      </span>
                      {poll.results ? (
                        <span className="poll__result-bar">
                          <span style={{ width: `${pct}%` }} />
                          <span className="poll__result-count">
                            {count} · {pct}%
                          </span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {poll.status === 'open' ? (
            <p className="poll__status">{isHost ? `${totalVotes} vote${totalVotes === 1 ? '' : 's'} so far` : 'Tap an option to vote.'}</p>
          ) : (
            <p className="poll__status">Poll closed · {totalVotes} vote{totalVotes === 1 ? '' : 's'}</p>
          )}
          {isHost && poll.status === 'open' ? (
            <button type="button" className="poll__close-btn" disabled={busy} onClick={close}>
              Close poll
            </button>
          ) : null}
        </div>
      ) : null}

      {isHost && (!poll || poll.status === 'closed') ? (
        <form className="poll__form" onSubmit={launch}>
          <input required placeholder="Question" maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} />
          {options.map((opt, i) => (
            <input
              key={i}
              required={i < 2}
              placeholder={`Option ${i + 1}`}
              maxLength={120}
              value={opt}
              onChange={(e) => setOptions((os) => os.map((o, j) => (j === i ? e.target.value : o)))}
            />
          ))}
          {options.length < 8 ? (
            <button type="button" className="poll__add-option" onClick={() => setOptions((os) => [...os, ''])}>
              + Add option
            </button>
          ) : null}
          <button type="submit" disabled={busy}>
            {busy ? 'Starting…' : 'Start poll'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
