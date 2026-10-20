import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminBlogPostSummary, BlogPostStatus } from '@aiit/shared';
import { CopyButton } from '@/components/common/CopyButton';
import { formatWhen, useAdminFetch } from './adminData';

const STATUS_LABEL: Record<BlogPostStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

const STATUS_FILTERS: ('all' | BlogPostStatus)[] = ['all', 'draft', 'scheduled', 'published', 'archived'];

function StatusPill({ status }: { status: BlogPostStatus }) {
  return <span className={`adm-status adm-status--b-${status}`}>{STATUS_LABEL[status]}</span>;
}

export default function AdminBlogPage() {
  const [status, setStatus] = useState<'all' | BlogPostStatus>('all');
  const [q, setQ] = useState('');
  const path = `/admin/blog${status === 'all' ? '' : `?status=${status}`}`;
  const list = useAdminFetch<AdminBlogPostSummary[]>(path);

  const rows = useMemo(() => {
    if (list.status !== 'ready') return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list.data;
    return list.data.filter((p) => p.title.toLowerCase().includes(needle) || p.slug.includes(needle));
  }, [list, q]);

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Content</p>
          <h1 className="adm-title">Blog</h1>
          <p className="adm-intro">
            Posts written here are committed straight to the Resources content folder on publish, the same place a
            hand-authored Markdown post would live. Nothing goes live until you click Publish.
          </p>
        </div>
        <Link to="/admin/blog/new" className="adm-btn adm-btn--primary">
          New post
        </Link>
      </div>

      <div className="adm-grid">
        <label className="adm-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | BlogPostStatus)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All' : STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field adm-field--wide">
          <span>Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or slug…" />
        </label>
      </div>

      {list.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {list.status === 'error' ? <p className="adm-error" role="alert">{list.message}</p> : null}
      {list.status === 'ready' && rows.length === 0 ? <p className="adm-muted">No posts match this filter.</p> : null}
      {list.status === 'ready' && rows.length > 0 ? (
        <ul className="adm-list" role="list">
          {rows.map((p) => (
            <li className="adm-card" key={p.id}>
              <div className="adm-card__main">
                <h3>
                  {p.title} <StatusPill status={p.status} />
                  {p.featured ? <span className="adm-tag adm-tag--creator">Featured</span> : null}
                </h3>
                <p className="adm-card__meta">
                  {p.category} · {p.authorName ?? 'Unknown author'} · updated {formatWhen(p.updatedAt)}
                  {p.publishedAt ? ` · published ${formatWhen(p.publishedAt)}` : ''}
                  {p.scheduledAt ? ` · scheduled for ${formatWhen(p.scheduledAt)}` : ''}
                </p>
                {p.lastCommitSha ? (
                  <p className="adm-muted">
                    Live at{' '}
                    <span className="adm-copyrow">
                      <code>/resources/{p.slug}</code>
                      <CopyButton value={`${window.location.origin}/resources/${p.slug}`} title="Copy post link" />
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="adm-card__actions">
                <Link to={`/admin/blog/${p.id}`} className="adm-btn adm-btn--ghost">
                  Edit
                </Link>
                {p.status === 'published' ? (
                  <a href={`/resources/${p.slug}`} target="_blank" rel="noreferrer" className="adm-btn adm-btn--ghost">
                    View live
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
