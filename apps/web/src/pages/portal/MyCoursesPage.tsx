import { useScrollReveal } from '@/lib/useScrollReveal';
import { useLearner } from './learnerData';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import { CoursePathRow } from './CoursePathRow';

export default function MyCoursesPage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your courses" />;
  if (state.status === 'error') return null;

  const { enrolled } = state.learner;
  const active = enrolled.filter((e) => e.status === 'active');
  const completed = enrolled.filter((e) => e.status === 'completed');

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">My courses</p>
        <h1 className="portal-page__title">Your courses</h1>
        <p className="portal-page__intro">
          Everything you are enrolled in — where you are, and the next step in each.
        </p>
      </header>

      {enrolled.length === 0 ? (
        <PortalEmpty
          title="No courses yet"
          body="Once you enrol in an AIIT programme it appears here — your status and the way back into the course."
          action={{ label: 'Browse courses', to: '/courses' }}
        />
      ) : (
        <>
          {active.length > 0 ? (
            <section className="portal-section" data-reveal>
              <p className="portal-eyebrow">In progress</p>
              <div className="dash__paths">
                {active.map((e) => (
                  <CoursePathRow key={e.id} enrolled={e} />
                ))}
              </div>
            </section>
          ) : null}

          {completed.length > 0 ? (
            <section className="portal-section" data-reveal>
              <p className="portal-eyebrow">Completed</p>
              <div className="dash__paths">
                {completed.map((e) => (
                  <CoursePathRow key={e.id} enrolled={e} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
