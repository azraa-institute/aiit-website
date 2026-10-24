import { StaffShell, type StaffNavEntry } from '@/components/staff/StaffShell';
import {
  AcademicsIcon,
  CalendarIcon,
  DashboardIcon,
  FlagIcon,
  GradingIcon,
  ProfileIcon,
  SupportIcon,
  SystemIcon,
} from '@/components/staff/StaffNavIcons';
// The instructor portal reuses the admin area's tables, forms and buttons (`adm-*`); only the frame differs.
import '@/pages/admin/admin.css';

const INSTRUCTOR_NAV: StaffNavEntry[] = [
  { to: '/instructor', label: 'Dashboard', end: true, icon: <DashboardIcon /> },
  { to: '/instructor/classes', label: 'My classes', icon: <CalendarIcon /> },
  { to: '/instructor/courses', label: 'My courses', icon: <AcademicsIcon /> },
  { to: '/instructor/grading', label: 'Grading', icon: <GradingIcon /> },
  { to: '/instructor/complaints', label: 'Report a student', icon: <FlagIcon /> },
  { to: '/instructor/profile', label: 'Profile', icon: <ProfileIcon /> },
  { to: '/instructor/support', label: 'Support', icon: <SupportIcon /> },
  { to: '/instructor/settings', label: 'Account settings', icon: <SystemIcon /> },
];

export default function InstructorLayout() {
  return <StaffShell portal="Instructor portal" tone="instructor" nav={INSTRUCTOR_NAV} />;
}
