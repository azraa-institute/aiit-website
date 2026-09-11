import type { Instructor } from './types';

/**
 * aiit.network lists courses under a single instructor identity, "AIIT Network",
 * and its Instructors page currently features one named instructor, Michael Eboh.
 */
export const INSTRUCTORS: Instructor[] = [
  {
    id: 'ins-aiit',
    name: 'AIIT Network',
    title: 'Course author',
    bio: 'Courses on AIIT are published under AIIT Network.',
    focus: [],
    image: '/assets/brand/aiit-network-logo-favicon-2-1.png',
  },
  {
    id: 'ins-michael-eboh',
    name: 'Michael Eboh',
    title: 'Instructor',
    bio: 'Listed as an instructor at Azraa Institute of Information Technology.',
    focus: [],
    image: '/assets/brand/aiit-network-logo-favicon-2-1.png',
  },
];

export function getInstructor(id: string | null): Instructor | undefined {
  if (!id) return undefined;
  return INSTRUCTORS.find((i) => i.id === id);
}
