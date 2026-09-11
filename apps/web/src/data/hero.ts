export interface HeroSlide {
  id: string;
  /** First line — the heading, verbatim from aiit.network. */
  heading: string;
  /** Second line — the subtext, verbatim from aiit.network. */
  subtext: string;
  /** Real hero image, or a motif keyword for the procedural fallback plate. */
  image: string;
  motif: 'lattice' | 'flow' | 'strata' | 'field' | 'horizon' | 'depth' | 'mesh' | 'signal';
  cta: { label: string; to: string };
}

/**
 * The seven homepage hero slides — headings, subtext, button labels and links
 * exactly as they appear on aiit.network.
 */
export const HERO_SLIDES: HeroSlide[] = [
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
    image: '/assets/webinar/aiit-free-webinar.webp',
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
