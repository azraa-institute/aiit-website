import { ROADMAP_STAGES, ROADMAP_ADVANTAGES, ROADMAP_HEADING, ROADMAP_INTRO } from '@/data/ecosystem';
import { Section } from '@/components/primitives/Section';
import { cn } from '@/lib/cn';
import { StageGlyph, AdvantageGlyph } from './RoadmapIcons';
import './learning-ecosystem.css';

/**
 * "Your Success Roadmap" — the seven-stage AIIT journey (ENROLL → GLOBAL CAREER)
 * on a connected pathway, followed by the AIIT Advantage bar. Horizontal,
 * zig-zag pathway on desktop; a vertical connected journey on smaller screens.
 */
export function LearningEcosystem() {
  return (
    <Section id="ecosystem" tone="paper" size="lg" className="roadmap-section">
      <div className="container container--wide">
        <header className="roadmap-head" data-reveal>
          <p className="roadmap-head__eyebrow">The AIIT journey</p>
          <h2 className="roadmap-head__title">
            Your <span className="roadmap-head__accent">Success</span> Roadmap
          </h2>
          <p className="roadmap-head__lead">{ROADMAP_HEADING}</p>
          <p className="roadmap-head__intro">{ROADMAP_INTRO}</p>
        </header>

        <div className="roadmap">
          <svg
            className="roadmap__spine"
            viewBox="0 0 1000 120"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="rm-spine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#c02b23" />
                <stop offset="0.62" stopColor="#9a7b4f" />
                <stop offset="1" stopColor="#7d6340" />
              </linearGradient>
            </defs>
            <path
              d="M71.4 60 C130 78 155 78 214.3 60 C273 42 298 42 357.1 60 C416 78 441 78 500 60 C559 42 584 42 642.9 60 C701 78 726 78 785.7 60 C844 42 869 42 928.6 60"
              fill="none"
              stroke="url(#rm-spine)"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <ol className="roadmap__stages" role="list">
          {ROADMAP_STAGES.map((stage, i) => (
            <li
              key={stage.index}
              className={cn(
                'roadmap__stage',
                i % 2 === 0 ? 'roadmap__stage--up' : 'roadmap__stage--down',
                i === ROADMAP_STAGES.length - 1 && 'roadmap__stage--final',
              )}
              data-accent={stage.accent}
              data-reveal
              style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
            >
              <div className="roadmap__milestone">
                <span className="roadmap__num">{stage.index}</span>
                <span className="roadmap__disc">
                  <StageGlyph name={stage.icon} />
                </span>
              </div>
              <div className="roadmap__card">
                <h3 className="roadmap__stage-title">{stage.title}</h3>
                <ul className="roadmap__points" role="list">
                  {stage.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
          </ol>
        </div>

        <div className="advantage-bar" data-reveal>
          <p className="advantage-bar__label">
            <span>AIIT</span>
            <span>Advantage</span>
          </p>
          <ul className="advantage-bar__items" role="list">
            {ROADMAP_ADVANTAGES.map((a) => (
              <li key={a.index} className="advantage-bar__item">
                <span className="advantage-bar__icon">
                  <AdvantageGlyph name={a.icon} />
                </span>
                <span className="advantage-bar__text">
                  <span className="advantage-bar__num">{a.index}</span>
                  {a.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
