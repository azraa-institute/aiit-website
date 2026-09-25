import { StaffShell, type StaffNavEntry } from '@/components/staff/StaffShell';
// The instructor portal reuses the admin area's tables, forms and buttons (`adm-*`); only the frame differs.
import '@/pages/admin/admin.css';

const INSTRUCTOR_NAV: StaffNavEntry[] = [
  { to: '/instructor', label: 'Dashboard', end: true },
  { to: '/instructor/classes', label: 'My classes' },
  { to: '/instructor/courses', label: 'My courses' },
  { to: '/instructor/grading', label: 'Grading' },
];

export default function InstructorLayout() {
  return <StaffShell portal="Instructor portal" tone="instructor" nav={INSTRUCTOR_NAV} />;
}
