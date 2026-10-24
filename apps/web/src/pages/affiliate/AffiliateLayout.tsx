import { StaffShell, type StaffNavItem } from '@/components/staff/StaffShell';
import { DashboardIcon, FinanceIcon, LinkIcon, MegaphoneIcon, SystemIcon } from '@/components/staff/StaffNavIcons';
// Reuses the admin area's tables, forms and buttons (`adm-*`); only the frame differs.
import '@/pages/admin/admin.css';

// "Resources" is a collapsible group with its own sub-pages, same pattern
// (and same shell__group-toggle/shell__subnav CSS, so the same smaller font
// size) as the admin sidebar's People/Academics/etc. groups -- see
// AdminLayout.tsx. The 3 sub-pages used to be one long scrolling page; split
// out so each topic (talking points, swipe copy, banners) is its own view.
// Icons on every top-level entry + the Resources group header, same as
// admin's sidebar -- sub-items under an open group stay icon-less
// (StaffShell's own convention, see its StaffNavEntry comment).
const AFFILIATE_NAV: StaffNavItem[] = [
  { to: '/affiliate-portal', label: 'Dashboard', end: true, icon: <DashboardIcon /> },
  { to: '/affiliate-portal/link', label: 'Referral link', icon: <LinkIcon /> },
  {
    label: 'Resources',
    icon: <MegaphoneIcon />,
    items: [
      { to: '/affiliate-portal/resources/talking-points', label: 'Talking points' },
      { to: '/affiliate-portal/resources/swipe-copy', label: 'Swipe copy' },
      { to: '/affiliate-portal/resources/graphics', label: 'Banners' },
    ],
  },
  { to: '/affiliate-portal/payout', label: 'Payout', icon: <FinanceIcon /> },
  { to: '/affiliate-portal/settings', label: 'Settings', icon: <SystemIcon /> },
];

export default function AffiliateLayout() {
  return <StaffShell portal="Affiliate portal" tone="affiliate" nav={AFFILIATE_NAV} />;
}
