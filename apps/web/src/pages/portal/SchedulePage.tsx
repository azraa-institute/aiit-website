import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LiveClassSummary } from '@aiit/shared';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/api';
import { buildClassCalendar } from '@/lib/ics';
import { CalendarIcon, ChevronRightIcon, ClockIcon, VideoIcon } from './ContentIcons';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import {
  dayKey,
  findClashes,
  formatClassDay,
  formatClassRange,
  formatClassTime,
  useDisplayZone,
  useLiveClasses,
  weekKeys,
} from './liveClassData';
import './portal.css';
import './schedule.css';

/** Polls so "waiting for instructor" turns into "Join class" on its own. */
const POLL_MS = 20_000;

type View = 'list' | 'week';

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

function ClassRow({ item, zone, clash }: { item: LiveClassSummary; zone: string; clash?: string[] }) {
  const status = statusLabel(item);
  const action = actionLabel(item);
  return (
    <li className={cn('lesson', item.joinState === 'open' && 'lesson--live')}>
      <div className="lesson__when">
        <span className="lesson__day">{formatClassDay(item.startsAt, zone)}</span>
        <span className="lesson__time">{formatClassRange(item.startsAt, item.endsAt, zone)}</span>
      </div>
      <div className="lesson__main">
        <h3 className="lesson__title">{item.title}</h3>
        <p className="lesson__meta">
          <Link to={`/courses/${item.courseSlug}`}>{item.courseTitle}</Link>
          {item.hostName ? <span> · with {item.hostName}</span> : null}
        </p>
        {clash && clash.length > 0 ? (
          <p className="lesson__clash">Overlaps with {[...new Set(clash)].join(', ')}</p>
        ) : null}
      </div>
      <div className="lesson__side">
        <span className={cn('lesson__status', `lesson__status--${status.tone}`)}>{status.text}</span>
        {action ? (
          <Link to={`/classroom/${item.id}`} className="lesson__cta">
            {action}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

/** Weekday/date/month as separate parts -- the redesigned day header gives
    each its own typographic weight (date large and serif, weekday/month
    small and understated) rather than one combined string. */
function dayParts(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }).toUpperCase(),
    day: d.toLocaleDateString(undefined, { day: 'numeric', timeZone: 'UTC' }),
    month: d.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }).toUpperCase(),
  };
}
const rangeLabel = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

function WeekView({ classes, zone, clashes }: { classes: LiveClassSummary[]; zone: string; clashes: Map<string, string[]> }) {
  const [offset, setOffset] = useState(0);
  const today = dayKey(new Date().toISOString(), zone);
  const days = weekKeys(today, offset);
  const byDay = new Map<string, LiveClassSummary[]>();
  for (const c of classes) {
    const key = dayKey(c.startsAt, zone);
    byDay.set(key, [...(byDay.get(key) ?? []), c]);
  }

  return (
    <div className="week">
      <div className="week__nav">
        <button type="button" className="week__nav-arrow" onClick={() => setOffset(offset - 1)} aria-label="Previous week">
          <ChevronRightIcon className="week__nav-chevron week__nav-chevron--prev" />
        </button>
        <span className="week__range">
          {rangeLabel(days[0])} – {rangeLabel(days[6])}
          {offset !== 0 ? (
            <button type="button" className="week__today-link" onClick={() => setOffset(0)}>
              This week
            </button>
          ) : null}
        </span>
        <button type="button" className="week__nav-arrow" onClick={() => setOffset(offset + 1)} aria-label="Next week">
          <ChevronRightIcon className="week__nav-chevron" />
        </button>
      </div>
      <div className="week__grid">
        {days.map((key) => {
          const parts = dayParts(key);
          const items = (byDay.get(key) ?? []).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
          const isToday = key === today;
          return (
            <section
              key={key}
              className={cn('week__day', items.length > 0 && 'has-classes', isToday && 'is-today')}
              aria-label={`${parts.weekday} ${parts.day} ${parts.month}`}
              aria-current={isToday ? 'date' : undefined}
            >
              <header className="week__dayhead">
                <p className="week__weekday">{parts.weekday}</p>
                <p className="week__date">{parts.day}</p>
                <p className="week__month">{parts.month}</p>
              </header>
              {items.length === 0 ? (
                <p className="week__none">
                  <CalendarIcon className="week__none-icon" />
                  No classes
                  <br />
                  scheduled
                </p>
              ) : (
                <div className="week__events">
                  {items.map((c) => {
                    const clash = clashes.get(c.id);
                    const action = actionLabel(c);
                    return (
                      <div key={c.id} className={cn('week__event', c.status === 'cancelled' && 'is-cancelled', clash && 'has-clash')}>
                        <p className="week__time">
                          <ClockIcon className="week__event-icon" />
                          {formatClassTime(c.startsAt, zone)} – {formatClassTime(c.endsAt, zone)}
                        </p>
                        <p className="week__title">{c.courseTitle}</p>
                        <p className="week__mode">
                          <VideoIcon className="week__event-icon" />
                          Online class
                        </p>
                        {clash ? <p className="lesson__clash">Overlaps</p> : null}
                        {c.status === 'cancelled' ? <p className="week__note">Cancelled</p> : null}
                        {action ? (
                          <Link to={`/classroom/${c.id}`} className="week__cta">
                            {action}
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const state = useLiveClasses(POLL_MS);
  const { zone, fromProfile } = useDisplayZone();
  const [view, setView] = useState<View>('list');
  // The List view's sections carry [data-reveal] and fully unmount when
  // switching to Week, then remount fresh (opacity:0, unobserved) on
  // switching back -- without `view` in the dependency array, nothing
  // re-triggers the IntersectionObserver for those newly-mounted nodes, so
  // the list stayed invisible until a full page reload. Same root cause as
  // the SupportPage bug fixed earlier, different trigger (a view toggle
  // instead of a second gating fetch).
  useScrollReveal([state.status, view]);

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

  const classes = state.classes;
  const now = Date.now();
  const active = classes.filter((c) => c.joinState === 'open' || c.joinState === 'waiting_for_host');
  const upcoming = classes.filter((c) => c.joinState === 'not_open');
  const earlier = classes
    .filter((c) => c.joinState === 'ended' || c.joinState === 'cancelled')
    .filter((c) => new Date(c.endsAt).getTime() <= now)
    .reverse();
  const isHost = classes.some((c) => c.role === 'host');
  const clashes = findClashes(classes);
  const courseCount = new Set(classes.map((c) => c.courseId)).size;

  function downloadCalendar() {
    const ics = buildClassCalendar(classes, window.location.origin);
    downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'aiit-live-classes.ics');
  }

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Timetable</p>
        <h1 className="portal-page__title">Live classes</h1>
        <p className="portal-page__intro">
          {isHost
            ? 'Classes assigned to you. Start one when ready -- learners join once it is live.'
            : courseCount > 1
              ? `One timetable for all ${courseCount} of your courses, updated automatically.`
              : 'Your live classes. Each opens shortly before it starts.'}
        </p>
        <p className="schedule-zone">
          Times shown in <strong>{zone.replace(/_/g, ' ')}</strong>
          {!isHost && fromProfile ? (
            <>
              {' '}
              (from your profile, <Link to="/portal/profile">change</Link>)
            </>
          ) : null}
          {!isHost && !fromProfile ? (
            <>
              {' '}
              (your device&apos;s time zone, <Link to="/portal/profile">set yours in your profile</Link>)
            </>
          ) : null}
        </p>
      </header>

      {classes.length === 0 ? (
        <PortalEmpty
          title="No live classes scheduled"
          body={
            isHost
              ? 'Classes assigned to you by the AIIT team will appear here.'
              : 'When a course you are enrolled in has live classes scheduled, they appear here automatically with the time and a Join button.'
          }
          action={isHost ? undefined : { label: 'Browse courses', to: '/courses' }}
        />
      ) : (
        <>
          <div className="schedule-tools">
            <div className="schedule-tabs" role="tablist" aria-label="Timetable view">
              <button type="button" role="tab" aria-selected={view === 'list'} className={cn(view === 'list' && 'is-active')} onClick={() => setView('list')}>
                List
              </button>
              <button type="button" role="tab" aria-selected={view === 'week'} className={cn(view === 'week' && 'is-active')} onClick={() => setView('week')}>
                Week
              </button>
            </div>
            <button type="button" className="schedule-ics" onClick={downloadCalendar}>
              Add to my calendar (.ics)
            </button>
          </div>

          {clashes.size > 0 && !isHost ? (
            <p className="schedule-warning" role="status">
              Two of your courses have classes at the same time. They are marked below; talk to the AIIT team if you need one moved.
            </p>
          ) : null}

          {view === 'week' ? (
            <WeekView classes={classes} zone={zone} clashes={clashes} />
          ) : (
            <>
              {active.length > 0 && (
                <section className="schedule-section" data-reveal>
                  <p className="portal-eyebrow">Happening now</p>
                  <ul className="lessons" role="list">
                    {active.map((c) => (
                      <ClassRow key={c.id} item={c} zone={zone} clash={clashes.get(c.id)} />
                    ))}
                  </ul>
                </section>
              )}
              {upcoming.length > 0 && (
                <section className="schedule-section" data-reveal>
                  <p className="portal-eyebrow">Upcoming</p>
                  <ul className="lessons" role="list">
                    {upcoming.map((c) => (
                      <ClassRow key={c.id} item={c} zone={zone} clash={clashes.get(c.id)} />
                    ))}
                  </ul>
                </section>
              )}
              {earlier.length > 0 && (
                <section className="schedule-section" data-reveal>
                  <p className="portal-eyebrow">Recently finished</p>
                  <ul className="lessons" role="list">
                    {earlier.map((c) => (
                      <ClassRow key={c.id} item={c} zone={zone} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
