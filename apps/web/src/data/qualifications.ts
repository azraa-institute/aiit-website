/** Highest-qualification picklist for the Profile page and the profile-completion wizard -- stored as free text on the backend (Profile.qualification), not an enum, so this list can grow without a migration. */
export const QUALIFICATIONS: { value: string; label: string }[] = [
  { value: 'high_school', label: 'High school' },
  { value: 'diploma', label: 'Diploma / certificate' },
  { value: 'associate', label: "Associate degree" },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'doctorate', label: 'Doctorate (PhD)' },
  { value: 'other', label: 'Other' },
];
