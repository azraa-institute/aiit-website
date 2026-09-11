import type { NavItem } from './types';

/** Matches aiit.network: HOME · ABOUT US · COURSES · AIIT RESOURCES · FAQS */
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', to: '/' },
  {
    label: 'About Us',
    to: '/about',
    children: [
      { label: 'About AIIT', to: '/about', description: 'The institute, the mission, the method.' },
      { label: 'Why Join AIIT', to: '/why-join', description: 'Seven reasons learners choose AIIT.' },
      { label: 'AIIT Blueprint', to: '/aiit-blueprint', description: 'Your gateway to global higher education.' },
      { label: 'Instructors', to: '/instructors', description: 'The people who teach at AIIT.' },
      { label: 'Contact Us', to: '/contact', description: "We'd love to hear from you." },
    ],
  },
  {
    label: 'Courses',
    to: '/courses',
    children: [
      { label: 'All courses', to: '/courses', description: 'Search, filter and compare every programme.' },
      { label: 'Artificial Intelligence', to: '/courses?domain=artificial-intelligence' },
      { label: 'Data Analytics & Data Science', to: '/courses?domain=data-analytics-data-science' },
      { label: 'Cloud Computing', to: '/courses?domain=cloud-computing' },
      { label: 'Networking & Cybersecurity', to: '/courses?domain=networking-cybersecurity' },
    ],
  },
  {
    label: 'AIIT Resources',
    to: '/resources',
    children: [
      { label: 'AIIT.network Blog', to: '/resources', description: 'Guides, explainers and career resources.' },
      { label: 'Free Webinar', to: '/webinar', description: 'Reserve your free seat.' },
    ],
  },
  { label: 'FAQs', to: '/faqs' },
];

/**
 * Footer "QUICK LINKS" — from aiit.network, with "AIIT Shop" added here so the
 * store (a secondary, non-core area) stays reachable without sitting in the
 * primary learning navigation.
 */
export const FOOTER_QUICK_LINKS = [
  { label: 'Affiliate', to: '/affiliate' },
  { label: 'AIIT Blueprint', to: '/aiit-blueprint' },
  { label: 'AIIT Resources', to: '/resources' },
  { label: 'Courses', to: '/courses' },
  { label: 'AIIT Shop', to: '/shop' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms and Conditions', to: '/terms' },
];

/**
 * Footer "POPULAR COURSES" — verbatim from aiit.network. `image` mirrors the
 * matching course in data/courses.ts (kept inline so the footer, which ships in
 * every page, doesn't pull the whole course catalogue into the bundle).
 */
export const FOOTER_POPULAR_COURSES = [
  {
    label: 'Cloud Computing Fundamentals',
    to: '/courses/cloud-computing-fundamentals',
    image: '/assets/courses/cloud-computing-fundamentals.jpg',
  },
  {
    label: 'Cisco CCNA (Cisco Certified Network Associate)',
    to: '/courses/cisco-ccna-cisco-certified-network-associate',
    image: '/assets/courses/cisco-ccna-cisco-certified-network-associate.jpg',
  },
  {
    label: 'Quantum Computing Fundamentals',
    to: '/courses/quantum-computing-fundamentals',
    image: '/assets/courses/quantum-computing-fundamentals.jpg',
  },
];

export const FOOTER_NAV = {
  explore: [
    { label: 'About Us', to: '/about' },
    { label: 'Courses', to: '/courses' },
    { label: 'AIIT Resources', to: '/resources' },
    { label: 'FAQs', to: '/faqs' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'AIIT Shop', to: '/shop' },
  ],
  learning: FOOTER_POPULAR_COURSES,
  opportunities: FOOTER_QUICK_LINKS,
  account: [
    { label: 'Login', to: '/login' },
    { label: 'Register', to: '/register' },
    { label: 'My Courses', to: '/portal/courses' },
    { label: 'Certificates', to: '/portal/certificates' },
  ],
};
