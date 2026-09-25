import { StaffShell, type StaffNavEntry } from '@/components/staff/StaffShell';

const INSTRUCTOR_NAV: StaffNavEntry[] = [{ to: '/instructor', label: 'My classes', end: true }];

export default function InstructorLayout() {
  return <StaffShell portal="Instructor portal" tone="instructor" nav={INSTRUCTOR_NAV} />;
}
