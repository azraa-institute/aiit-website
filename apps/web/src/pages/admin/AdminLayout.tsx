import { StaffShell, type StaffNavItem } from '@/components/staff/StaffShell';
import {
  AcademicsIcon,
  ContentIcon,
  DashboardIcon,
  FinanceIcon,
  PeopleIcon,
  SupportIcon,
  SystemIcon,
} from '@/components/staff/StaffNavIcons';
import './admin.css';

const ADMIN_NAV: StaffNavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true, icon: <DashboardIcon /> },
  {
    label: 'People',
    icon: <PeopleIcon />,
    items: [
      { to: '/admin/students', label: 'Students' },
      { to: '/admin/instructors', label: 'Instructors' },
      { to: '/admin/admins', label: 'Admins' },
      { to: '/admin/affiliates', label: 'Affiliates' },
    ],
  },
  {
    label: 'Academics',
    icon: <AcademicsIcon />,
    items: [
      { to: '/admin/courses', label: 'Courses' },
      { to: '/admin/timetables', label: 'Timetables' },
      { to: '/admin/classes', label: 'Classes' },
      { to: '/admin/certificates', label: 'Certificates' },
    ],
  },
  {
    label: 'Content',
    icon: <ContentIcon />,
    items: [
      { to: '/admin/blog', label: 'Blog' },
      { to: '/admin/webinars', label: 'Webinars' },
      { to: '/admin/announcements', label: 'Announcements' },
    ],
  },
  {
    label: 'Support',
    icon: <SupportIcon />,
    items: [
      { to: '/admin/complaints', label: 'Complaints' },
      { to: '/admin/messages', label: 'Messages' },
    ],
  },
  {
    label: 'Finance',
    icon: <FinanceIcon />,
    items: [
      { to: '/admin/payments', label: 'Payments' },
      { to: '/admin/reports', label: 'Reports' },
    ],
  },
  {
    label: 'System',
    icon: <SystemIcon />,
    items: [
      { to: '/admin/audit', label: 'Audit log' },
      { to: '/admin/settings', label: 'Settings' },
    ],
  },
];

export default function AdminLayout() {
  return <StaffShell portal="Administration" tone="admin" nav={ADMIN_NAV} />;
}
