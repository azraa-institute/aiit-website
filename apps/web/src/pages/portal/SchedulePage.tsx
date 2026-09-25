import { Link } from 'react-router-dom';
import type { LiveClassSummary } from '@aiit/shared';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { cn } from '@/lib/cn';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import { formatClassDay, formatClassRange, useLiveClasses } from './liveClassData';
import './schedule.css';

/** Polls so "waiting for instructor" turns into "Join class" on its own. */
const POLL_MS = 20_000;

function statusLabel(c: LiveClassSummary): { text: string; tone: 'live' | 'soon' | 'done' | 'muted' } {
  switch (c.joinState) {
    case 'open':
      return c.status === 'live' ? { text: 'Live now', tone: 'live' } : { text: 'Ready to start', tone: 'soon' };
    case 'waiting_for_host':
      return { text: 'Waiting for instructor', tone: 'soon' };
    case 'not_open':
      return { text: 'Upcoming', tone: 'muted' };
    case 'cancelled':
      return { text: 'Cancelled', tone: 'done' };
    default:
      return { text: 'Ended', tone: 'done' };
  }
}

function actionLabel(c: LiveClassSummary): string | null {
  if (c.joinState === 'open') {
    if (c.role === 'host') return c.status === 'live' ? 'Rejoin class' : 'Start class';
    return 'Join class';
  }
  if (c.joinState === 'waiting_for_host') return 'Open classroom';
  return null;
}

function ClassRow({ item }: { item: LiveClassSummary }) {
  const status = statusLabel(item);
  const action = actionLabel(item);
  return (
    <li className={cn('lesson', item.joinState === 'open' && 'lesson--live')}>
      <div className="lesson__when">
        <span className="lesson__day">{formatClassDay(item.startsAt)}</span>
        <span className="lesson__time">{formatClassRange(item.startsAt, item.endsAt)}</span>
      </div>
      <div className="lesson__main">
        <h3 className="lesson__title">{item.title}</h3>
        <p className="lesson__meta">
          <Link to={`/courses/${item.courseSlug}`}>{item.courseTitle}</Link>
          {item.hostName ? <span> · with {item.hostName}</span> : null}
        </p>
      </div>
      <div className="lesson__side">
        <span className={cn('lesson__status', `lesson__status--${status.tone}`)}>{status.text}</span>
        {action ? (
          <Link to={`/portal/classes/${item.id}`} className="lesson__cta">
            {action}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export default function SchedulePage() {
  const state = useLiveClasses(POLL_MS);
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your timetable" />;

  if (state.status === 'error') {
    return (
      <div className="portal-page">
        <PortalEmpty
          title="Couldn't load your timetable"
          body={state.message}
          action={{ label: 'Back to dashboard', to: '/portal' }}
        />
      </div>
    );
  }

  const now = Date.now();
  const active = state.classes.filter((c) => c.joinState === 'open' || c.joinState === 'waiting_for_host');
  const upcoming = state.classes.filter((c) => c.joinState === 'not_open');
  const earlier = state.classes
    .filter((c) => c.joinState === 'ended' || c.joinState === 'cancelled')
    .filter((c) => new Date(c.endsAt).getTime() <= now)
    .reverse();
  const isHost = state.classes.some((c) => c.role === 'host');

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Timetable</p>
        <h1 className="portal-page__title">Live classes</h1>
        <p className="portal-page__intro">
          {isHost
            ? 'The classes assigned to you. Start a class when you are ready — learners can join once it is live.'
            : 'Your live classes, in your own time zone. A class opens shortly before it starts, and you join once your instructor begins.'}
        </p>
      </header>

      {state.classes.length === 0 ? (
        <PortalEmpty
          title="No live classes scheduled"
          body={
            isHost
              ? 'Classes assigned to you by the AIIT team will appear here.'
              : 'When a course you are enrolled in has live classes scheduled, they appear here with the time and a Join button.'
          }
          action={isHost ? undefined : { label: 'Browse courses', to: '/courses' }}
        />
      ) : (
        <>
          {active.length > 0 && (
            <section className="schedule-section" data-reveal>
              <p className="portal-eyebrow">Happening now</p>
              <ul className="lessons" role="list">
                {active.map((c) => (
                  <ClassRow key={c.id} item={c} />
                ))}
              </ul>
            </section>
          )}
          {upcoming.length > 0 && (
            <section className="schedule-section" data-reveal>
              <p className="portal-eyebrow">Upcoming</p>
              <ul className="lessons" role="list">
                {upcoming.map((c) => (
                  <ClassRow key={c.id} item={c} />
                ))}
              </ul>
            </section>
          )}
          {earlier.length > 0 && (
            <section className="schedule-section" data-reveal>
              <p className="portal-eyebrow">Recently finished</p>
              <ul className="lessons" role="list">
                {earlier.map((c) => (
                  <ClassRow key={c.id} item={c} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
