/** Current-status picklist for the profile-completion wizard's Education step -- stored as free text on the backend (Profile.currentStatus), not an enum. */
export const CURRENT_STATUSES: { value: string; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'working_professional', label: 'Working professional' },
  { value: 'job_seeker', label: 'Job seeker' },
  { value: 'other', label: 'Other' },
];
