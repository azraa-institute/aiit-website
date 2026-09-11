import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { formatDate } from '@/lib/format';
import { useLearner } from './learnerData';
import type { PortalNotification } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';

const KIND_LABEL: Record<PortalNotification['kind'], string> = {
  course: 'Course',
  certificate: 'Certificate',
  assignment: 'Assignment',
  webinar: 'Webinar',
  system: 'AIIT',
};

export default function NotificationsPage() {
  const state = useLearner();
  useScrollReveal([state.status]);
  // Local read-state overlay; the backend is the source of truth once wired.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  if (state.status === 'loading') return <PortalLoader label="Loading your notifications" />;
  if (state.status === 'error') return null;

  const items = [...state.learner.notifications].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Notifications</p>
        <h1 className="portal-page__title">What&apos;s new</h1>
        <p className="portal-page__intro">
          Course announcements, grades, certificates and webinar reminders — newest first.
        </p>
      </header>

      {items.length === 0 ? (
        <PortalEmpty
          title="You&apos;re all caught up"
          body="Announcements from your courses, new grades and webinar reminders will appear here as they happen."
        />
      ) : (
        <ul className="notes" role="list">
          {items.map((n) => {
            const isRead = n.read || readIds.has(n.id);
            const inner = (
              <>
                <span className="notes__kind">{KIND_LABEL[n.kind]}</span>
                <span className="notes__text">
                  <span className="notes__title">{n.title}</span>
                  {n.body ? <span className="notes__body">{n.body}</span> : null}
                </span>
                <span className="notes__at">{formatDate(n.at, { day: 'numeric', month: 'short' })}</span>
              </>
            );
            return (
              <li key={n.id} className="notes__item" data-unread={isRead ? undefined : ''}>
                {n.href ? (
                  <Link
                    to={n.href}
                    className="notes__link"
                    onClick={() => setReadIds((s) => new Set(s).add(n.id))}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="notes__link"
                    onClick={() => setReadIds((s) => new Set(s).add(n.id))}
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
