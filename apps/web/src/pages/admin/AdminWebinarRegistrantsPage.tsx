import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AdminWebinar, AdminWebinarRegistrant } from '@aiit/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { formatWhen, useAdminFetch } from './adminData';

/**
 * A separate drill-down view, not shown inline on the edit form -- the
 * project owner asked for registrants to live behind a click, reached
 * from the webinar editor, rather than always rendered under the fields
 * they're actively editing.
 */
export default function AdminWebinarRegistrantsPage() {
  const { id } = useParams<{ id: string }>();
  const webinar = useAdminFetch<AdminWebinar>(id ? `/admin/webinars/${id}` : null);
  const registrants = useAdminFetch<AdminWebinarRegistrant[]>(id ? `/admin/webinars/${id}/registrations` : null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState<'24h' | '30m' | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const noJoinUrl = webinar.status === 'ready' && !webinar.data.joinUrl;

  async function toggleAttended(r: AdminWebinarRegistrant) {
    setBusyId(r.id);
    setError(undefined);
    try {
      await apiFetch(`/admin/webinars/registrations/${r.id}/attended`, {
        method: 'PATCH',
        body: JSON.stringify({ attended: !r.attendedAt }),
      });
      registrants.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update that registrant.');
    } finally {
      setBusyId(null);
    }
  }

  async function sendReminder(kind: '24h' | '30m') {
    if (!id) return;
    setReminderBusy(kind);
    setReminderNotice(undefined);
    setError(undefined);
    try {
      const result = await apiFetch<{ sentCount: number }>(`/admin/webinars/${id}/send-reminder`, {
        method: 'POST',
        body: JSON.stringify({ kind }),
      });
      if (result.sentCount === 0 && webinar.status === 'ready' && !webinar.data.joinUrl) {
        setReminderNotice('Sent to 0 -- this webinar has no join link set yet, so reminders have nowhere to send people. Add one on the webinar form first.');
      } else {
        setReminderNotice(`Sent to ${result.sentCount} registrant${result.sentCount === 1 ? '' : 's'}.`);
      }
      registrants.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send that reminder.');
    } finally {
      setReminderBusy(null);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Content</p>
          <h1 className="adm-title">
            {webinar.status === 'ready' ? `${webinar.data.title} -- Registrants` : 'Registrants'}
          </h1>
        </div>
        <Link to="/admin/webinars" className="adm-btn adm-btn--ghost">
          Back to webinars
        </Link>
      </div>

      <section className="adm-panel" aria-labelledby="registrants">
        <div className="adm-panel__head">
          <h2 id="registrants">Registrants</h2>
          <div className="adm-actions">
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={reminderBusy !== null || noJoinUrl}
              title={noJoinUrl ? 'Add a join link to this webinar first.' : undefined}
              onClick={() => sendReminder('24h')}
            >
              {reminderBusy === '24h' ? 'Sending…' : 'Send 24h reminder now'}
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={reminderBusy !== null || noJoinUrl}
              title={noJoinUrl ? 'Add a join link to this webinar first.' : undefined}
              onClick={() => sendReminder('30m')}
            >
              {reminderBusy === '30m' ? 'Sending…' : 'Send 30min reminder now'}
            </button>
          </div>
        </div>
        <p className="adm-muted">
          Reminders also send automatically (24h and 30min before the start time) once a join link is set on the
          webinar -- these buttons are for an early or manual resend, not the normal path.
        </p>
        {noJoinUrl ? (
          <p className="adm-notice" role="status">
            This webinar has no join link set yet, so reminders can't be sent. Add one on the webinar form.
          </p>
        ) : null}
        {reminderNotice ? (
          <p className="adm-notice" role="status">
            {reminderNotice}
          </p>
        ) : null}
        {error ? (
          <p className="adm-error" role="alert">
            {error}
          </p>
        ) : null}

        {registrants.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
        {registrants.status === 'error' ? (
          <p className="adm-error" role="alert">
            {registrants.message}
          </p>
        ) : null}
        {registrants.status === 'ready' && registrants.data.length === 0 ? <p className="adm-muted">No one has registered yet.</p> : null}
        {registrants.status === 'ready' && registrants.data.length > 0 ? (
          <div className="adm-tablewrap">
            <table className="adm-table adm-table--rows">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Region</th>
                  <th>Registered</th>
                  <th>Reminders sent</th>
                  <th>Attended</th>
                </tr>
              </thead>
              <tbody>
                {registrants.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td>{r.region}</td>
                    <td>{formatWhen(r.createdAt)}</td>
                    <td>
                      {r.confirmationSentAt ? 'Confirmed' : 'Not confirmed'}
                      {r.reminder24hSentAt ? ' · 24h' : ''}
                      {r.reminder30mSentAt ? ' · 30m' : ''}
                    </td>
                    <td>
                      <button type="button" className="adm-linkbtn" disabled={busyId === r.id} onClick={() => toggleAttended(r)}>
                        {r.attendedAt ? 'Attended ✓' : 'Mark attended'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
