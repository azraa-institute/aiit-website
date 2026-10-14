import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AdminWebinar, AdminWebinarRegistrant, WebinarAgendaItem, WebinarInput, WebinarStatus } from '@aiit/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { formatWhen, useAdminFetch } from './adminData';

const STATUS_OPTIONS: { value: WebinarStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'past', label: 'Past' },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

const EMPTY: WebinarInput = {
  slug: '',
  title: '',
  heroHeadline: '',
  kicker: '',
  summary: '',
  description: '',
  startsAt: null,
  scheduleNote: 'To be announced',
  durationLabel: '60–90 mins',
  timezoneNote: '',
  platform: 'Zoom / Google Meet',
  language: 'English',
  seatsLimited: true,
  agenda: [{ title: '', points: [''] }],
  audience: [''],
  image: '',
  videoUrl: null,
  videoThumbnail: null,
  joinUrl: null,
  status: 'upcoming',
  featured: false,
};

function toForm(w: AdminWebinar): WebinarInput {
  return {
    slug: w.slug,
    title: w.title,
    heroHeadline: w.heroHeadline,
    kicker: w.kicker,
    summary: w.summary,
    description: w.description,
    startsAt: w.startsAt,
    scheduleNote: w.scheduleNote,
    durationLabel: w.durationLabel,
    timezoneNote: w.timezoneNote,
    platform: w.platform,
    language: w.language,
    seatsLimited: w.seatsLimited,
    agenda: w.agenda.length > 0 ? w.agenda : [{ title: '', points: [''] }],
    audience: w.audience.length > 0 ? w.audience : [''],
    image: w.image,
    videoUrl: w.videoUrl,
    videoThumbnail: w.videoThumbnail,
    joinUrl: w.joinUrl,
    status: w.status,
    featured: w.featured,
  };
}

/** Local datetime-input value <-> ISO string -- the input works in the browser's own time zone, same convention as the admin Timetables/Classes forms. */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RegistrantsPanel({ webinarId }: { webinarId: string }) {
  const state = useAdminFetch<AdminWebinarRegistrant[]>(`/admin/webinars/${webinarId}/registrations`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState<'24h' | '30m' | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string>();
  const [error, setError] = useState<string>();

  async function toggleAttended(r: AdminWebinarRegistrant) {
    setBusyId(r.id);
    setError(undefined);
    try {
      await apiFetch(`/admin/webinars/registrations/${r.id}/attended`, {
        method: 'PATCH',
        body: JSON.stringify({ attended: !r.attendedAt }),
      });
      state.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update that registrant.');
    } finally {
      setBusyId(null);
    }
  }

  async function sendReminder(kind: '24h' | '30m') {
    setReminderBusy(kind);
    setReminderNotice(undefined);
    setError(undefined);
    try {
      const result = await apiFetch<{ sentCount: number }>(`/admin/webinars/${webinarId}/send-reminder`, {
        method: 'POST',
        body: JSON.stringify({ kind }),
      });
      setReminderNotice(`Sent to ${result.sentCount} registrant${result.sentCount === 1 ? '' : 's'}.`);
      state.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send that reminder.');
    } finally {
      setReminderBusy(null);
    }
  }

  return (
    <section className="adm-panel" aria-labelledby="registrants">
      <div className="adm-panel__head">
        <h2 id="registrants">Registrants</h2>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--ghost" disabled={reminderBusy !== null} onClick={() => sendReminder('24h')}>
            {reminderBusy === '24h' ? 'Sending…' : 'Send 24h reminder now'}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" disabled={reminderBusy !== null} onClick={() => sendReminder('30m')}>
            {reminderBusy === '30m' ? 'Sending…' : 'Send 30min reminder now'}
          </button>
        </div>
      </div>
      <p className="adm-muted">
        Reminders also send automatically (24h and 30min before the start time) once a join link is set below --
        these buttons are for an early or manual resend, not the normal path.
      </p>
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

      {state.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {state.status === 'error' ? (
        <p className="adm-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === 'ready' && state.data.length === 0 ? <p className="adm-muted">No one has registered yet.</p> : null}
      {state.status === 'ready' && state.data.length > 0 ? (
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
              {state.data.map((r) => (
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
  );
}

export default function AdminWebinarEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const existing = useAdminFetch<AdminWebinar>(isNew ? null : `/admin/webinars/${id}`);

  const [form, setForm] = useState<WebinarInput>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [webinar, setWebinar] = useState<AdminWebinar | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (existing.status === 'ready') {
      setForm(toForm(existing.data));
      setWebinar(existing.data);
    }
  }, [existing]);

  function update<K extends keyof WebinarInput>(key: K, value: WebinarInput[K]) {
    setNotice(undefined);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTitleChange(title: string) {
    update('title', title);
    if (!slugTouched) update('slug', slugify(title));
  }

  function updateAgendaItem(index: number, item: WebinarAgendaItem) {
    const next = [...form.agenda];
    next[index] = item;
    update('agenda', next);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    const dto: WebinarInput = {
      ...form,
      agenda: form.agenda.filter((a) => a.title.trim().length > 0).map((a) => ({ title: a.title.trim(), points: a.points.filter((p) => p.trim()) })),
      audience: form.audience.map((a) => a.trim()).filter(Boolean),
    };
    try {
      if (webinar) {
        const updated = await apiFetch<AdminWebinar>(`/admin/webinars/${webinar.id}`, { method: 'PUT', body: JSON.stringify(dto) });
        setWebinar(updated);
        setForm(toForm(updated));
        setNotice('Saved.');
      } else {
        const created = await apiFetch<AdminWebinar>('/admin/webinars', { method: 'POST', body: JSON.stringify(dto) });
        navigate(`/admin/webinars/${created.id}`, { replace: true });
        setWebinar(created);
        setNotice('Webinar created.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this webinar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!webinar) return;
    if (!window.confirm(`Delete "${webinar.title}"? Registrants keep their own records, but this removes it from the catalog.`)) return;
    try {
      await apiFetch(`/admin/webinars/${webinar.id}`, { method: 'DELETE' });
      navigate('/admin/webinars', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this webinar.');
    }
  }

  if (!isNew && existing.status === 'loading') return <p className="adm-muted">Loading…</p>;
  if (!isNew && existing.status === 'error') return <p className="adm-error" role="alert">{existing.message}</p>;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Content</p>
          <h1 className="adm-title">{webinar ? webinar.title || 'Edit webinar' : 'New webinar'}</h1>
        </div>
        <Link to="/admin/webinars" className="adm-btn adm-btn--ghost">
          Back to webinars
        </Link>
      </div>

      <form className="adm-form" onSubmit={handleSave}>
        <h2 className="adm-h2">Content</h2>
        <div className="adm-grid">
          <label className="adm-field adm-field--wide">
            <span>Title (shown as the page's H1)</span>
            <input required minLength={3} maxLength={200} value={form.title} onChange={(e) => onTitleChange(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Slug</span>
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update('slug', e.target.value);
              }}
            />
          </label>
          <label className="adm-field">
            <span>Hero headline (homepage card)</span>
            <input required maxLength={200} value={form.heroHeadline} onChange={(e) => update('heroHeadline', e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Eyebrow / kicker</span>
            <input required maxLength={160} value={form.kicker} onChange={(e) => update('kicker', e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Summary (SEO description + homepage card)</span>
            <textarea required minLength={10} maxLength={400} rows={2} value={form.summary} onChange={(e) => update('summary', e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Description (shown in event details)</span>
            <textarea required minLength={10} maxLength={1000} rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </label>
        </div>

        <h2 className="adm-h2">Schedule</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Starts at (optional -- leave blank for "to be announced")</span>
            <input
              type="datetime-local"
              value={toLocalInputValue(form.startsAt)}
              onChange={(e) => update('startsAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </label>
          <label className="adm-field">
            <span>Schedule note (shown when no exact date)</span>
            <input required maxLength={80} value={form.scheduleNote} onChange={(e) => update('scheduleNote', e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Duration label</span>
            <input required maxLength={40} value={form.durationLabel} onChange={(e) => update('durationLabel', e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Timezone note</span>
            <input required maxLength={80} value={form.timezoneNote} onChange={(e) => update('timezoneNote', e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Platform</span>
            <input required maxLength={80} value={form.platform} onChange={(e) => update('platform', e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Language</span>
            <input required maxLength={40} value={form.language} onChange={(e) => update('language', e.target.value)} />
          </label>
          <label className="adm-check">
            <input type="checkbox" checked={form.seatsLimited} onChange={(e) => update('seatsLimited', e.target.checked)} />
            <span>Seats limited</span>
          </label>
          <label className="adm-field">
            <span>Join link (Zoom/Meet -- revealed to registrants once set; also required for reminders to send)</span>
            <input maxLength={500} value={form.joinUrl ?? ''} onChange={(e) => update('joinUrl', e.target.value || null)} />
          </label>
        </div>

        <h2 className="adm-h2">Agenda</h2>
        {form.agenda.map((item, i) => (
          <div className="adm-grid" key={i}>
            <label className="adm-field adm-field--wide">
              <span>Field {i + 1} title</span>
              <input value={item.title} onChange={(e) => updateAgendaItem(i, { ...item, title: e.target.value })} />
            </label>
            <label className="adm-field adm-field--wide">
              <span>Points (one per line)</span>
              <textarea
                rows={3}
                value={item.points.join('\n')}
                onChange={(e) => updateAgendaItem(i, { ...item, points: e.target.value.split('\n') })}
              />
            </label>
            <div className="adm-field">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => update('agenda', form.agenda.filter((_, idx) => idx !== i))}
              >
                Remove field
              </button>
            </div>
          </div>
        ))}
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => update('agenda', [...form.agenda, { title: '', points: [''] }])}>
            Add agenda field
          </button>
        </div>

        <h2 className="adm-h2">Audience &amp; media</h2>
        <div className="adm-grid">
          <label className="adm-field adm-field--wide">
            <span>Who should attend (one per line)</span>
            <textarea rows={4} value={form.audience.join('\n')} onChange={(e) => update('audience', e.target.value.split('\n'))} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Flyer image URL</span>
            <input required maxLength={400} value={form.image} onChange={(e) => update('image', e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Video URL (R2-hosted, optional)</span>
            <input maxLength={500} value={form.videoUrl ?? ''} onChange={(e) => update('videoUrl', e.target.value || null)} />
          </label>
          <label className="adm-field">
            <span>Video poster image URL (16:9, optional)</span>
            <input maxLength={500} value={form.videoThumbnail ?? ''} onChange={(e) => update('videoThumbnail', e.target.value || null)} />
          </label>
        </div>

        <h2 className="adm-h2">Publishing</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => update('status', e.target.value as WebinarStatus)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-check">
            <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} />
            <span>Featured -- this is the one shown on /webinar and the homepage</span>
          </label>
        </div>

        {error ? (
          <p className="adm-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="adm-notice" role="status">
            {notice}
          </p>
        ) : null}

        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save webinar'}
          </button>
          {webinar ? (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={handleDelete}>
              Delete webinar
            </button>
          ) : null}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/webinars')}>
            Cancel
          </button>
        </div>
      </form>

      {webinar ? <RegistrantsPanel webinarId={webinar.id} /> : null}
    </div>
  );
}
