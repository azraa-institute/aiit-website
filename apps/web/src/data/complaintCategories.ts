import type { ComplaintCategory } from '@aiit/shared';

/**
 * Display labels for complaint categories. Lives here rather than in
 * @aiit/shared because that package is types-only (no runtime entry), so it
 * cannot export a value.
 */
export const COMPLAINT_CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  learning_issue: 'A problem with my learning',
  instructor: 'An issue with an instructor',
  course_content: 'The course content',
  technical: 'A technical problem',
  payment: 'Payment or billing',
  other: 'Something else',
};
