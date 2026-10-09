import { Link, useParams } from 'react-router-dom';
import type { Assignment, LiveClassSummary } from '@aiit/shared';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { Plate } from '@/components/primitives/Plate';
import { Button } from '@/components/primitives/Button';
import { useLearner } from './learnerData';
import { formatClassDay, formatClassRange, useDisplayZone, useLiveClasses } from './liveClassData';
import { AssignmentRow } from './AssignmentRow';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import './course-workspace.css';

const ASSIGNMENT_ORDER: Record<Assignment['status'], number> = { overdue: 0, upcoming: 1, submitted: 2, graded: 3 };

/** Of this course's classes, the one worth surfacing: live/joinable first, then the soonest still to come. */
function nextClass(classes: LiveClassSummary[]): LiveClassSummary | null {
  const relevant = classes.filter((c) => c.status !== 'cancelled' && c.status !== 'ended');
  const open = relevant.filter((c) => c.joinState === 'open' || c.joinState === 'waiting_for_host');
  if (open.length > 0) return open.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const upcoming = relevant.filter((c) => c.joinState === 'not_open');
  return upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
}

function actionLabel(c: LiveClassSummary): string {
  if (c.joinState === 'open') return 'Join class';
  if (c.joinState === 'waiting_for_host') return 'Open classroom';
  return 'View class details';
}

export default function CourseWorkspacePage() {
  const { slug } = useParams();
  const learnerState = useLearner();
  const classesState = useLiveClasses(20_000);
  const { zone } = useDisplayZone();
  useScrollReveal([learnerState.status, slug]);

  if (learnerState.status === 'loading') return <PortalLoader label="Loading your course" />;
  if (learnerState.status === 'error') return null;

  const enrollment = learnerState.learner.enrolled.find((e) => e.course.slug === slug);
  if (!enrollment) {
    return (
      <div className="portal-page">
        <PortalEmpty
          title="Course not found"
          body="This isn't one of your enrolled courses. It may have been removed, or the link may be wrong."
          action={{ label: 'My courses', to: '/portal/courses' }}
        />
      </div>
    );
  }

  const { course } = enrollment;
  const assignments = learnerState.learner.assignments
    .filter((a) => a.course.id === course.id)
    .sort((a, b) => ASSIGNMENT_ORDER[a.status] - ASSIGNMENT_ORDER[b.status]);
  const classes = classesState.status === 'ready' ? classesState.classes.filter((c) => c.courseId === course.id) : [];
  const next = nextClass(classes);
  const needsGrading = assignments.filter((a) => a.status === 'overdue' || a.status === 'upcoming').length;

  return (
    <div className="portal-page cwork">
      <header className="cwork__head" data-reveal>
        <Link to="/portal/courses" className="cwork__back">
          ← My courses
        </Link>
        <div className="cwork__head-row">
          <Plate source={course.image} seed={course.slug} motif={course.domain?.motif} ratio={1} fit="contain" className="cwork__plate" />
          <div>
            <p className="portal-eyebrow">{enrollment.status === 'completed' ? 'Completed' : 'In progress'}</p>
            <h1 className="portal-page__title">{course.title}</h1>
            {course.domain ? <p className="cwork__domain">{course.domain.name}</p> : null}
            <Button as="link" to={`/courses/${course.slug}`} variant="link" size="sm">
              View the full course page
            </Button>
          </div>
        </div>
      </header>

      <section className="cwork__section" data-reveal>
        <p className="portal-eyebrow">Next live class</p>
        {next ? (
          <div className="cwork__class">
            <div>
              <p className="cwork__class-when">
                {formatClassDay(next.startsAt, zone)} · {formatClassRange(next.startsAt, next.endsAt, zone)}
              </p>
              <h2 className="cwork__class-title">{next.title}</h2>
              {next.hostName ? <p className="cwork__class-host">with {next.hostName}</p> : null}
              {next.joinState === 'waiting_for_host' ? (
                <p className="cwork__class-note">The window is open. You can join as soon as your instructor starts.</p>
              ) : null}
            </div>
            <Link to={`/classroom/${next.id}`} className="cwork__class-cta">
              {actionLabel(next)}
            </Link>
          </div>
        ) : (
          <p className="cwork__none">No upcoming class scheduled for this course right now.</p>
        )}
        <Button as="link" to="/portal/schedule" variant="link" size="sm">
          View full timetable
        </Button>
      </section>

      <section className="cwork__section" data-reveal>
        <div className="cwork__section-head">
          <p className="portal-eyebrow">Assignments</p>
          {needsGrading > 0 ? <span className="cwork__flag">{needsGrading} to do</span> : null}
        </div>
        {assignments.length === 0 ? (
          <p className="cwork__none">No assignments have been set for this course yet.</p>
        ) : (
          <ul className="tasklist" role="list">
            {assignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} onSubmitted={learnerState.refetch} />
            ))}
          </ul>
        )}
      </section>

      <section className="cwork__section cwork__section--muted" data-reveal>
        <p className="portal-eyebrow">Syllabus</p>
        <p className="cwork__none">
          A full lesson-by-lesson syllabus for this course is coming soon. In the meantime, the outcomes and
          curriculum overview are on the{' '}
          <Link to={`/courses/${course.slug}`} className="cwork__link">
            course page
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
