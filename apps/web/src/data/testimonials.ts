/**
 * "Our Reviews / What our students across the world are saying" — the homepage
 * testimonial slideshow. Each entry: a short title, the student's words, their
 * initials, name and location.
 */
export interface StudentStory {
  id: string;
  title: string;
  quote: string;
  initials: string;
  name: string;
  location: string;
}

export const STUDENT_STORIES: StudentStory[] = [
  {
    id: 'amina-yusuf',
    title: 'Confidence to pursue opportunities',
    quote:
      'AIIT completely changed my career path. I enrolled in the Full Stack Development program with no coding experience, and within months I was building real-world applications. The instructors were patient, and the mentorship gave me the confidence to pursue international opportunities.',
    initials: 'AY',
    name: 'Amina Yusuf',
    location: 'Lagos, Nigeria',
  },
  {
    id: 'kwame-mensah',
    title: 'AIIT helped me create a professional portfolio',
    quote:
      'What impressed me most about AIIT was the practical approach to learning. Every lesson was project-based, and the career coaching helped me create a professional portfolio that attracted recruiters.',
    initials: 'KM',
    name: 'Kwame Mensah',
    location: 'Accra, Ghana',
  },
  {
    id: 'lilian-njeri',
    title: 'AIIT made complex concepts easy to understand',
    quote:
      'The Cybersecurity program exceeded my expectations. From networking fundamentals to ethical hacking, everything was taught in a way that made complex concepts easy to understand. I highly recommend AIIT.',
    initials: 'LN',
    name: 'Lilian Njeri',
    location: 'Nairobi, Kenya',
  },
  {
    id: 'jean-claude-uwimana',
    title: 'AIIT gave me confidence',
    quote:
      'AIIT gave me more than technical skills — it gave me confidence. The live classes, supportive instructors, and collaborative community made learning enjoyable and rewarding.',
    initials: 'JU',
    name: 'Jean-Claude Uwimana',
    location: 'Kigali, Rwanda',
  },
  {
    id: 'mpho-dlamini',
    title: 'I am grateful to AIIT',
    quote:
      'The Data Analytics course transformed how I work with business data. I now build dashboards, analyze trends, and make informed decisions that add value to my organization.',
    initials: 'MD',
    name: 'Mpho Dlamini',
    location: 'Gaborone, Botswana',
  },
  {
    id: 'fatima-rahman',
    title: 'My experience at AIIT is amazing',
    quote:
      'I joined AIIT to study Artificial Intelligence and Machine Learning. The curriculum was current, practical, and easy to follow. The hands-on assignments prepared me for real industry challenges.',
    initials: 'FR',
    name: 'Fatima Rahman',
    location: 'Dhaka, Bangladesh',
  },
  {
    id: 'arjun-nair',
    title: 'Certification preparation was easier than I expected',
    quote:
      'The Cloud Computing program was outstanding. The instructors explained AWS and cloud architecture with practical examples, making certification preparation much easier than I expected.',
    initials: 'AN',
    name: 'Arjun Nair',
    location: 'Kochi, India',
  },
  {
    id: 'maria-santos',
    title: 'I could learn at my own pace while receiving support',
    quote:
      "As a working professional, I appreciated AIIT's flexible online classes. I could learn at my own pace while receiving support whenever I had questions. It was one of the best investments I've made.",
    initials: 'MS',
    name: 'Maria Santos',
    location: 'Manila, Philippines',
  },
  {
    id: 'nur-aisyah-putri',
    title: 'AIIT genuinely cared about my success',
    quote:
      'The UI/UX Design course helped me build an impressive portfolio. I learned modern design tools, user research, and prototyping from experienced professionals who genuinely cared about my success.',
    initials: 'NA',
    name: 'Nur Aisyah Putri',
    location: 'Jakarta, Indonesia',
  },
  {
    id: 'tran-minh-anh',
    title: 'Prepared to compete confidently in the global tech industry',
    quote:
      "AIIT combines quality instruction with genuine mentorship. The career guidance, mock interviews, and practical projects prepared me to compete confidently in today's global tech industry.",
    initials: 'TM',
    name: 'Tran Minh Anh',
    location: 'Ho Chi Minh City, Vietnam',
  },
];

export const STUDENT_STORY_COUNT = STUDENT_STORIES.length;

export const REVIEWS_HEADING = 'What our students across the world are saying';
export const REVIEWS_EYEBROW = 'Our Reviews';
