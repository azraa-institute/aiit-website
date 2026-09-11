import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ADMISSIONS_ANNOUNCEMENT,
  WEBINAR_ANNOUNCEMENT,
  webinarLabel,
} from '@/data/announcements';
import './announcement-bar.css';

/** Slim red announcement bar pinned above the header. */
export function AnnouncementBar() {
  const ref = useRef<HTMLElement>(null);
  const webinar = webinarLabel();
  const webinarActive = WEBINAR_ANNOUNCEMENT.status !== 'coming-soon';

  /* Publish the bar's real height so the fixed header and page padding always
     track it, whatever the content or viewport. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () =>
      document.documentElement.style.setProperty('--ab-h', `${el.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <aside className="announcement-bar" aria-label="Announcements" ref={ref}>
      <div className="container container--wide announcement-bar__inner">
        <Link
          to={ADMISSIONS_ANNOUNCEMENT.link}
          className="announcement-bar__item announcement-bar__item--primary"
        >
          <span className="announcement-bar__dot" aria-hidden="true" />
          {ADMISSIONS_ANNOUNCEMENT.message}
        </Link>

        <span className="announcement-bar__sep" aria-hidden="true" />

        {WEBINAR_ANNOUNCEMENT.webinarLink ? (
          <Link
            to={WEBINAR_ANNOUNCEMENT.webinarLink}
            className="announcement-bar__item announcement-bar__item--secondary"
            data-active={webinarActive ? '' : undefined}
          >
            {webinar}
          </Link>
        ) : (
          <span className="announcement-bar__item announcement-bar__item--secondary">{webinar}</span>
        )}
      </div>
    </aside>
  );
}
