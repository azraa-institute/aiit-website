import { StaffShell, type StaffNavEntry } from '@/components/staff/StaffShell';
import './admin.css';

const ADMIN_NAV: StaffNavEntry[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/instructors', label: 'Instructors' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/timetables', label: 'Timetables' },
  { to: '/admin/classes', label: 'Classes' },
  { to: '/admin/audit', label: 'Audit log' },
];

export default function AdminLayout() {
  return <StaffShell portal="Administration" tone="admin" nav={ADMIN_NAV} />;
}
