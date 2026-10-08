import { StaffShell, type StaffNavEntry } from '@/components/staff/StaffShell';
import './admin.css';

const ADMIN_NAV: StaffNavEntry[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/instructors', label: 'Instructors' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/timetables', label: 'Timetables' },
  { to: '/admin/classes', label: 'Classes' },
  { to: '/admin/complaints', label: 'Complaints' },
  { to: '/admin/affiliates', label: 'Affiliates' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/messages', label: 'Messages' },
  { to: '/admin/audit', label: 'Audit log' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
  return <StaffShell portal="Administration" tone="admin" nav={ADMIN_NAV} />;
}
