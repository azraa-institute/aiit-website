/** Primary-learning-goal picklist for the profile-completion wizard's Goals step -- stored as free text on the backend (Profile.learningGoal), not an enum. */
export const LEARNING_GOALS: { value: string; label: string }[] = [
  { value: 'build_skills', label: 'Build new skills' },
  { value: 'earn_certifications', label: 'Earn professional certifications' },
  { value: 'advance_career', label: 'Advance my career' },
  { value: 'further_education', label: 'Prepare for further education' },
  { value: 'explore_new_field', label: 'Explore a new field' },
  { value: 'other', label: 'Other' },
];
