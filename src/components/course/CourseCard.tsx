import { useCallback, useRef, type CSSProperties, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '@/data/types';
import { getDomain } from '@/data/technologies';
import { getInstructor } from '@/data/instructors';
import { formatPrice, discountPercent, formatEnrollment } from '@/lib/format';
import { Plate } from '@/components/primitives/Plate';
import { Stars } from '@/components/common/Stars';
import { cn } from '@/lib/cn';
import './course-card.css';

const STATUS_LABEL: Record<string, string> = {
  featured: 'Featured',
  new: 'New',
  hot: 'Popular',
  special: 'Special',
  'coming-soon': 'Coming soon',
};

/**
 * A restrained accent identity per domain — used only for the hover ring,
 * small highlights and the focus outline. All values are deep and desaturated
 * so the page stays black / cream / charcoal; nothing reads as a colour block.
 */
const DOMAIN_ACCENT: Record<string, string> = {
  'artificial-intelligence': '#42566d', // muted cobalt
  'data-science': '#584a6a', // muted violet
  'cloud-computing': '#4a6a68', // muted teal
  'quantum-computing': '#4a4d76', // restrained indigo
  'edge-computing': '#466070', // slate blue
  cybersecurity: '#6e3b40', // deep burgundy
  blockchain: '#8a6a45', // bronze
  'software-development': '#4a6a56', // muted green
  'digital-literacy': '#9a7b4f', // brass
  design: '#95693f', // warm amber
};
const accentFor = (domainId: string | null) =>
  (domainId && DOMAIN_ACCENT[domainId]) || 'var(--brass)';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface CourseCardProps {
  course: Course;
  /** 'feature' = larger editorial treatment; 'list' = compact row. */
  layout?: 'grid' | 'feature' | 'list';
  index?: number;
}

export function CourseCard({ course, layout = 'grid', index }: CourseCardProps) {
  const domain = getDomain(course.domainId);
  const instructor = getInstructor(course.instructorId);
  const off = discountPercent(course.price, course.priceWas);
  const comingSoon = course.statuses.includes('coming-soon');
  const primaryStatus = course.statuses.find((s) => s !== 'featured') ?? course.statuses[0];

  // The compact list row keeps the plain treatment — the "mirror card"
  // interaction belongs to the grid / feature cards, which are the primary
  // interactive objects.
  const rich = layout !== 'list';

  const cardRef = useRef<HTMLElement>(null);
  const frame = useRef(0);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el || (e.pointerType && e.pointerType !== 'mouse') || prefersReducedMotion()) return;
    const media = (el.querySelector('.course-card__media-link') as HTMLElement | null) ?? el;
    const rect = media.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--cc-rx', ((px - 0.5) * 3).toFixed(2)); // ±1.5deg
      el.style.setProperty('--cc-ry', ((0.5 - py) * 2.4).toFixed(2)); // ±1.2deg
      el.style.setProperty('--cc-px', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--cc-py', `${(py * 100).toFixed(1)}%`);
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty('--cc-rx', '0');
    el.style.setProperty('--cc-ry', '0');
    el.style.setProperty('--cc-px', '50%');
    el.style.setProperty('--cc-py', '0%');
  }, []);

  return (
    <article
      ref={cardRef}
      className={cn('course-card', `course-card--${layout}`)}
      style={{ '--card-accent': accentFor(course.domainId) } as CSSProperties}
      onPointerMove={rich ? handlePointerMove : undefined}
      onPointerLeave={rich ? handlePointerLeave : undefined}
      data-reveal
    >
      <Link
        to={`/courses/${course.slug}`}
        className="course-card__media-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        {rich && <span className="course-card__stack" aria-hidden="true" />}
        <Plate
          source={course.image}
          seed={course.slug}
          motif={domain?.motif}
          ratio={layout === 'feature' ? 16 / 10 : 4 / 3}
          className="course-card__media"
        />
        {rich && <span className="course-card__sheen" aria-hidden="true" />}
        {typeof index === 'number' && (
          <span className="course-card__num index-num">{String(index + 1).padStart(2, '0')}</span>
        )}
      </Link>

      <div className="course-card__body">
        <div className="course-card__meta">
          <span className="course-card__category">{domain?.name ?? 'Technology'}</span>
          {primaryStatus && (
            <span className={cn('tag', comingSoon ? '' : 'tag--accent')}>{STATUS_LABEL[primaryStatus]}</span>
          )}
        </div>

        <h3 className="course-card__title">
          <Link to={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>

        {layout !== 'list' && <p className="course-card__summary">{course.summary}</p>}

        <dl className="course-card__facts">
          <div>
            <dt>Level</dt>
            <dd>{course.level}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{course.durationLabel || 'TBA'}</dd>
          </div>
          <div>
            <dt>Enrolled</dt>
            <dd>{comingSoon ? 'TBA' : formatEnrollment(course.enrolled)}</dd>
          </div>
        </dl>

        <div className="course-card__foot">
          <div className="course-card__price">
            {course.priceWas && <span className="course-card__was">{formatPrice(course.priceWas)}</span>}
            <span className="course-card__now">{formatPrice(course.price)}</span>
            {off && <span className="course-card__off">−{off}%</span>}
          </div>
          {course.rating > 0 ? (
            <Stars value={course.rating} count={course.ratingCount} />
          ) : (
            <span className="course-card__instructor">By {instructor?.name ?? 'AIIT Network'}</span>
          )}
        </div>
      </div>
    </article>
  );
}
