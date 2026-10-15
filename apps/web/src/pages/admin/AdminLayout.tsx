import { StaffShell, type StaffNavItem } from '@/components/staff/StaffShell';
import './admin.css';

const ADMIN_NAV: StaffNavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  {
    label: 'People',
    items: [
      { to: '/admin/students', label: 'Students' },
      { to: '/admin/instructors', label: 'Instructors' },
      { to: '/admin/admins', label: 'Admins' },
      { to: '/admin/affiliates', label: 'Affiliates' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { to: '/admin/courses', label: 'Courses' },
      { to: '/admin/timetables', label: 'Timetables' },
      { to: '/admin/classes', label: 'Classes' },
      { to: '/admin/certificates', label: 'Certificates' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/blog', label: 'Blog' },
      { to: '/admin/webinars', label: 'Webinars' },
      { to: '/admin/announcements', label: 'Announcements' },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/admin/complaints', label: 'Complaints' },
      { to: '/admin/messages', label: 'Messages' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/admin/payments', label: 'Payments' },
      { to: '/admin/reports', label: 'Reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/audit', label: 'Audit log' },
      { to: '/admin/settings', label: 'Settings' },
    ],
  },
];

export default function AdminLayout() {
  return <StaffShell portal="Administration" tone="admin" nav={ADMIN_NAV} />;
}
