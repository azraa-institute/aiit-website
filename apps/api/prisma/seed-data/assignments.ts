/**
 * Demo/dev assignments, clearly separated from real content -- there is no
 * admin authoring UI yet, so this is the only way assignments exist right
 * now. Scoped to the one free course a learner can actually self-enroll in
 * without a payment flow. Due dates are relative to when seed.ts runs (not
 * a fixed calendar date), so re-seeding keeps "upcoming" vs "overdue"
 * meaningful instead of everything eventually going stale-overdue forever.
 */
export interface AssignmentSeed {
  courseSlug: string;
  title: string;
  description: string;
  /** Days from now, or null for no due date. */
  dueInDays: number | null;
}

export const ASSIGNMENTS: AssignmentSeed[] = [
  {
    courseSlug: 'digital-and-tech-literacy-absolute-beginner',
    title: 'Set up your first cloud account',
    description:
      'Create a free-tier account with a major cloud provider (Google, Microsoft, or AWS) and take a screenshot of your dashboard once signed in.',
    dueInDays: 14,
  },
  {
    courseSlug: 'digital-and-tech-literacy-absolute-beginner',
    title: 'Write a short reflection on AI in daily life',
    description:
      'In 150-250 words, describe one tool or app you use that relies on artificial intelligence, and explain in plain language what you think it is doing.',
    dueInDays: 21,
  },
  {
    courseSlug: 'digital-and-tech-literacy-absolute-beginner',
    title: 'Organise your files in the cloud',
    description:
      'Create a simple folder structure in a cloud storage service (Google Drive, OneDrive, or Dropbox) and upload at least three files into it.',
    dueInDays: null,
  },
];
