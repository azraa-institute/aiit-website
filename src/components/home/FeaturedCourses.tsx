import { Link } from 'react-router-dom';
import { FEATURED_COURSES } from '@/data/courses';
import { Section, SectionHeading } from '@/components/primitives/Section';
import { CourseCard } from '@/components/course/CourseCard';
import { Button } from '@/components/primitives/Button';
import './featured-courses.css';

export function FeaturedCourses() {
  const [lead, ...rest] = FEATURED_COURSES;
  const shown = rest.slice(0, 5);

  return (
    <Section id="courses" tone="paper" size="lg">
      <div className="container container--wide">
        <div className="featured-courses__head">
          <SectionHeading
            eyebrow="Courses"
            title="Top Courses"
            intro="Practical, project-based programmes in AI, Data Science, Cloud, Cyber Security and more, most on offer, all certified by AIIT."
          />
          <Button as="link" to="/courses" variant="secondary" arrow className="featured-courses__all">
            Load more
          </Button>
        </div>

        <div className="featured-courses__grid">
          <div className="featured-courses__lead">
            <CourseCard course={lead} layout="feature" />
          </div>
          <div className="featured-courses__rest">
            {shown.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </div>

        <p className="featured-courses__foot">
          Looking for something specific?{' '}
          <Link to="/courses">Search and filter the full catalogue →</Link>
        </p>
      </div>
    </Section>
  );
}
