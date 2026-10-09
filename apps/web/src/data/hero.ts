export interface HeroSlide {
  id: string;
  /** First line — the heading, verbatim from aiit.network. */
  heading: string;
  /** Second line — the subtext, verbatim from aiit.network. */
  subtext: string;
  /** Real hero image, or a motif keyword for the procedural fallback plate. Used as the video's poster when `video` is set. */
  image: string;
  motif: 'lattice' | 'flow' | 'strata' | 'field' | 'horizon' | 'depth' | 'mesh' | 'signal';
  cta: { label: string; to: string };
  /** When set, this slide plays a muted autoplay video instead of a static image; advances on the video's own `ended` event rather than the fixed INTERVAL. */
  video?: string;
  /** Overrides INTERVAL for this slide's progress-dot fill duration -- used for the video slide so the dot animates over the video's real length. */
  durationMs?: number;
}

/**
 * The homepage hero slides — headings, subtext, button labels and links
 * exactly as they appear on aiit.network, plus a video intro slide.
 */
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'intro',
    heading: 'Technology, People, Opportunity — Without Borders',
    subtext: 'Global tech education for a brighter tomorrow.',
    image: '/assets/hero/hero-intro-poster.jpg',
    video: '/assets/hero/hero-intro.mp4',
    durationMs: 40000,
    motif: 'lattice',
    cta: { label: 'Ready to get started?', to: '/courses' },
  },
  {
    id: 'career',
    heading: 'Ready to build your global career?',
    subtext: 'Turn your skills into professional opportunities.',
    image: '/assets/hero/global-it-career.webp',
    motif: 'lattice',
    cta: { label: 'Learn more', to: '/aiit-blueprint' },
  },
  {
    id: 'webinar',
    heading: 'Join our free live webinar',
    subtext: 'Mastering Modern Information Technology',
    // Deliberately its own file, not the /webinar page's flyer image: this
    // slide needs a full-bleed photographic background like every other
    // hero slide, not a portrait promotional poster.
    image: '/assets/hero/live-webinar-session.webp',
    motif: 'signal',
    cta: { label: 'Learn more', to: '/webinar' },
  },
  {
    id: 'source-code',
    heading: 'Your Future Has a Source Code',
    subtext: 'Create the tech that defines the next decade.',
    image: '/assets/hero/your-future-has-a-source-code.webp',
    motif: 'depth',
    cta: { label: 'Ready to get started?', to: '/courses' },
  },
  {
    id: 'gurus',
    heading: 'Learn From Tech Gurus',
    subtext: 'Guiding the next generation of tech leaders',
    image: '/assets/courses/aiit-student-class.webp',
    motif: 'mesh',
    cta: { label: 'Ready to get started?', to: '/courses' },
  },
  {
    id: 'literacy',
    heading: 'Go for Digital & Tech Literacy',
    subtext: 'Learn AI, Data Science, Cyber Security + more',
    image: '/assets/hero/study-journey.webp',
    motif: 'field',
    cta: { label: 'Ready to get started?', to: '/courses' },
  },
  {
    id: 'seats',
    heading: 'Limited Seats Available',
    subtext: 'Start your journey with AIIT',
    image: '/assets/hero/collaborative-tech-lounge.webp',
    motif: 'horizon',
    cta: { label: 'Ready to get started?', to: '/courses' },
  },
  {
    id: 'community',
    heading: 'Be the next to join us',
    subtext: 'Connect with friends sharing same ideas with you.',
    image: '/assets/hero/ai-tech-workspace.webp',
    motif: 'flow',
    cta: { label: 'Ready to get started?', to: '/courses' },
  },
];
