import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminWebinarSummary, WebinarStatus } from '@aiit/shared';
import { formatWhen, useAdminFetch } from './adminData';

const STATUS_LABEL: Record<WebinarStatus, string> = {
  upcoming: 'Upcoming',
  live: 'Live',
  past: 'Past',
};

export default function AdminWebinarsPage() {
  const [q, setQ] = useState('');
  const list = useAdminFetch<AdminWebinarSummary[]>('/admin/webinars');

  const rows =
    list.status === 'ready'
      ? list.data.filter((w) => !q.trim() || w.title.toLowerCase().includes(q.trim().toLowerCase()) || w.slug.includes(q.trim()))
      : [];

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Content</p>
          <h1 className="adm-title">Webinars</h1>
          <p className="adm-intro">
            The live /webinar page renders from whichever of these is featured. Registrants get an automatic
            email confirmation, plus a 24-hour and 30-minute reminder once a join link is set here.
          </p>
        </div>
        <Link to="/admin/webinars/new" className="adm-btn adm-btn--primary">
          New webinar
        </Link>
      </div>

      <div className="adm-grid">
        <label className="adm-field adm-field--wide">
          <span>Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or slug…" />
        </label>
      </div>

      {list.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {list.status === 'error' ? (
        <p className="adm-error" role="alert">
          {list.message}
        </p>
      ) : null}
      {list.status === 'ready' && rows.length === 0 ? <p className="adm-muted">No webinars match this search.</p> : null}
      {list.status === 'ready' && rows.length > 0 ? (
        <ul className="adm-list" role="list">
          {rows.map((w) => (
            <li className="adm-card" key={w.id}>
              <div className="adm-card__main">
                <h3>
                  {w.title}{' '}
                  <span className={`adm-status adm-status--b-${w.status === 'upcoming' ? 'draft' : w.status === 'live' ? 'published' : 'archived'}`}>
                    {STATUS_LABEL[w.status]}
                  </span>
                  {w.featured ? <span className="adm-tag adm-tag--creator">Featured on /webinar</span> : null}
                </h3>
                <p className="adm-card__meta">
                  {w.startsAt ? formatWhen(w.startsAt) : 'Date to be announced'} · {w.registrationCount} registrant
                  {w.registrationCount === 1 ? '' : 's'} · updated {formatWhen(w.updatedAt)}
                </p>
              </div>
              <div className="adm-card__actions">
                <Link to={`/admin/webinars/${w.id}`} className="adm-btn adm-btn--ghost">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
