import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { RESOURCES } from '@/data/resources';
import { shortCategory } from '@/lib/resourceEditorial';
import { Button } from '@/components/primitives/Button';
import {
  useLearner,
  journeyPhases,
  primaryNextAction,
  isEmptyLearner,
  greetingName,
} from './learnerData';
import { PortalJourney } from './PortalJourney';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import { CoursePathRow } from './CoursePathRow';

const LATEST_RESOURCES = [...RESOURCES]
  .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
  .slice(0, 3);

export default function DashboardPage() {
  const state = useLearner();
  useScrollReveal([state.status]);

  if (state.status === 'loading') return <PortalLoader label="Loading your dashboard" />;
  if (state.status === 'error') return null; // handled by the layout

  const learner = state.learner;
  const firstName = greetingName(learner);
  const empty = isEmptyLearner(learner);
  const phases = journeyPhases(learner);
  const active = learner.enrolled.filter((e) => e.status === 'active');
  const nextAction = primaryNextAction(learner);

  return (
    <div className="dash">
      <header className="dash__intro" data-reveal>
        <p className="portal-eyebrow">Your learning journey</p>
        <h1 className="dash__greeting">
          {empty
            ? 'Your AIIT journey begins here'
            : firstName
              ? `Welcome back, ${firstName}`
              : 'Welcome back'}
        </h1>
        <p className="dash__lead">
          {empty
            ? 'Choose a technology. Start learning. Build real skills. Earn your certificate. Move forward.'
            : 'Continue where you left off.'}
        </p>
      </header>

      <section className="dash__status" aria-label="Your totals" data-reveal>
        <p className="portal-eyebrow portal-eyebrow--onfield">Your journey</p>
        <dl className="dash__metrics">
          <div className="dash__metric">
            <dd>{learner.enrolled.length}</dd>
            <dt>{learner.enrolled.length === 1 ? 'Course' : 'Courses'}</dt>
            <span className="dash__metric-note">
              {active.length > 0 ? `${active.length} in progress` : 'enrolled'}
            </span>
          </div>
          <div className="dash__metric">
            <dd>{learner.certificates.length}</dd>
            <dt>{learner.certificates.length === 1 ? 'Certificate' : 'Certificates'}</dt>
            <span className="dash__metric-note">earned</span>
          </div>
          <div className="dash__metric">
            <dd>{learner.webinars.length}</dd>
            <dt>{learner.webinars.length === 1 ? 'Webinar' : 'Webinars'}</dt>
            <span className="dash__metric-note">registered</span>
          </div>
        </dl>
      </section>

      <section className="dash__journey" data-reveal>
        <div className="dash__block-head">
          <p className="portal-eyebrow">The AIIT pathway</p>
          <p className="dash__journey-hint">
            {empty
              ? 'Every AIIT learner moves through the same five phases. Yours starts the day you enrol.'
              : 'Where you are across the AIIT pathway right now.'}
          </p>
        </div>
        <PortalJourney phases={phases} />
      </section>

      {empty ? (
        <PortalEmpty
          eyebrow="Continue learning"
          title="You haven't enrolled in a course yet"
          body="Explore AIIT's technology programmes and choose where you want to begin. Your courses, progress and certificates will appear here as you go."
          action={{ label: 'Browse courses', to: '/courses' }}
          aside={
            <>
              Not sure where to start?{' '}
              <Link to="/why-join">See why learners choose AIIT</Link>.
            </>
          }
        />
      ) : (
        <>
          {nextAction ? (
            <section className="dash__next" data-reveal aria-label="Your next step">
              <div className="dash__next-body">
                <p className="portal-eyebrow">Next</p>
                <p className="dash__next-context">{nextAction.context ?? 'Pick up your learning'}</p>
              </div>
              <Button as="link" to={nextAction.href} arrow>
                {nextAction.label}
              </Button>
            </section>
          ) : null}

          <section className="dash__continue" data-reveal>
            <div className="dash__block-head">
              <p className="portal-eyebrow">Continue learning</p>
              <Link to="/portal/courses" className="dash__block-link">
                All courses <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            {active.length > 0 ? (
              <div className="dash__paths">
                {active.map((e) => (
                  <CoursePathRow key={e.id} enrolled={e} />
                ))}
              </div>
            ) : (
              <p className="dash__all-done">
                You&apos;re up to date on every active course.{' '}
                <Link to="/portal/certificates">See your certificates</Link>.
              </p>
            )}
          </section>
        </>
      )}

      <section className="dash__explore" data-reveal>
        <div className="dash__block-head">
          <p className="portal-eyebrow">Continue exploring</p>
          <Link to="/portal/resources" className="dash__block-link">
            All resources <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <ul className="dash__explore-list" role="list">
          {LATEST_RESOURCES.map((r) => (
            <li key={r.id}>
              <Link to={`/resources/${r.slug}`} className="dash__explore-item">
                <span className="dash__explore-cat">{shortCategory(r.category)}</span>
                <span className="dash__explore-title">{r.title}</span>
                <span className="dash__explore-meta">{r.readMinutes} min read</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
