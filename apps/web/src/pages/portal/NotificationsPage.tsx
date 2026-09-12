import { Link } from 'react-router-dom';
import type { Notification } from '@aiit/shared';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { apiFetch } from '@/lib/api';
import { useLearner } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';

const KIND_LABEL: Record<Notification['kind'], string> = {
  course: 'Course',
  certificate: 'Certificate',
  assignment: 'Assignment',
  webinar: 'Webinar',
  system: 'AIIT',
};

export default function NotificationsPage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your notifications" />;
  if (state.status === 'error') return null;

  const items = [...state.learner.notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const hasUnread = items.some((n) => !n.read);

  async function markRead(id: string) {
    try {
      await apiFetch(`/me/notifications/${id}`, { method: 'PATCH' });
    } finally {
      state.refetch();
    }
  }

  async function markAllRead() {
    try {
      await apiFetch('/me/notifications', { method: 'PATCH' });
    } finally {
      state.refetch();
    }
  }

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <div className="portal-page__head-row">
          <div>
            <p className="portal-eyebrow">Notifications</p>
            <h1 className="portal-page__title">What&apos;s new</h1>
            <p className="portal-page__intro">
              Course announcements, grades, certificates and webinar reminders — newest first.
            </p>
          </div>
          {hasUnread ? (
            <Button as="button" variant="secondary" size="sm" onClick={markAllRead}>
              Mark all as read
            </Button>
          ) : null}
        </div>
      </header>

      {items.length === 0 ? (
        <PortalEmpty
          title="You're all caught up"
          body="Announcements from your courses, new grades and webinar reminders will appear here as they happen."
        />
      ) : (
        <ul className="notes" role="list">
          {items.map((n) => {
            const inner = (
              <>
                <span className="notes__kind">{KIND_LABEL[n.kind]}</span>
                <span className="notes__text">
                  <span className="notes__title">{n.title}</span>
                  {n.body ? <span className="notes__body">{n.body}</span> : null}
                </span>
                <span className="notes__at">{formatDate(n.createdAt, { day: 'numeric', month: 'short' })}</span>
              </>
            );
            return (
              <li key={n.id} className="notes__item" data-unread={n.read ? undefined : ''}>
                {n.href ? (
                  <Link to={n.href} className="notes__link" onClick={() => !n.read && markRead(n.id)}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="notes__link"
                    disabled={n.read}
                    onClick={() => markRead(n.id)}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
