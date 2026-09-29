import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminContactMessage, Paginated } from '@aiit/shared';
import { formatWhen, useAdminFetch } from './adminData';

export default function AdminMessagesPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set('q', q);
  const list = useAdminFetch<Paginated<AdminContactMessage>>(`/admin/messages?${query.toString()}`);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  useEffect(() => {
    if (search === q) return;
    const t = window.setTimeout(() => setParam('q', search.trim()), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = list.status === 'ready' ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Communication</p>
          <h1 className="adm-title">Messages</h1>
          <p className="adm-intro">
            Everything submitted through the public Contact form on aiit.network — including anyone who used the
            &quot;Contact us&quot; link shown after a suspended sign-in.
          </p>
        </div>
      </div>

      <div className="adm-toolbar">
        <label className="adm-field">
          <span>Search</span>
          <input type="search" placeholder="Name, email or message" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {list.status === 'loading' ? <p className="adm-muted">Loading…</p> : null}
      {list.status === 'error' ? <p className="adm-error" role="alert">{list.message}</p> : null}
      {list.status === 'ready' && list.data.items.length === 0 ? <p className="adm-muted">No messages match.</p> : null}

      {list.status === 'ready' && list.data.items.length > 0 ? (
        <>
          <p className="adm-muted">{list.data.total.toLocaleString()} message{list.data.total === 1 ? '' : 's'}</p>
          <ul className="adm-list" role="list">
            {list.data.items.map((m) => (
              <li className="adm-card" key={m.id}>
                <div className="adm-card__main">
                  <h3>
                    {m.name} <span className="adm-muted">· {m.email}</span>
                  </h3>
                  <p className="adm-card__meta">
                    {m.topic} · {formatWhen(m.createdAt)}
                  </p>
                  <p className="adm-prewrap">{m.message}</p>
                </div>
                <div className="adm-card__actions">
                  <a className="adm-btn adm-btn--ghost" href={`mailto:${m.email}`}>
                    Reply by email
                  </a>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <nav className="adm-pager" aria-label="Pages">
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                Previous
              </button>
              <span className="adm-muted">
                Page {page} of {totalPages}
              </span>
              <button type="button" className="adm-btn adm-btn--ghost" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>
                Next
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
