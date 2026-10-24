import { StaffShell, type StaffNavItem } from '@/components/staff/StaffShell';
import { ChatIcon, CoinsIcon, DashboardIcon, FolderIcon, ImageIcon, LinkIcon, SwipeCopyIcon, SystemIcon } from '@/components/staff/StaffNavIcons';
// Reuses the admin area's tables, forms and buttons (`adm-*`); only the frame differs.
import '@/pages/admin/admin.css';

// "Resources" is a collapsible group with its own sub-pages, same pattern
// (and same shell__group-toggle/shell__subnav CSS, so the same smaller font
// size) as the admin sidebar's People/Academics/etc. groups -- see
// AdminLayout.tsx. The 3 sub-pages used to be one long scrolling page; split
// out so each topic (talking points, swipe copy, banners) is its own view.
// Every entry, including the 3 Resources sub-items, has its own icon
// (StaffShell renders a sub-item's icon too, unlike admin's own groups,
// which simply don't pass one).
const AFFILIATE_NAV: StaffNavItem[] = [
  { to: '/affiliate-portal', label: 'Dashboard', end: true, icon: <DashboardIcon /> },
  { to: '/affiliate-portal/link', label: 'Referral link', icon: <LinkIcon /> },
  {
    label: 'Resources',
    icon: <FolderIcon />,
    items: [
      { to: '/affiliate-portal/resources/talking-points', label: 'Talking points', icon: <ChatIcon /> },
      { to: '/affiliate-portal/resources/swipe-copy', label: 'Swipe copy', icon: <SwipeCopyIcon /> },
      { to: '/affiliate-portal/resources/graphics', label: 'Banners', icon: <ImageIcon /> },
    ],
  },
  { to: '/affiliate-portal/payout', label: 'Payout', icon: <CoinsIcon /> },
  { to: '/affiliate-portal/settings', label: 'Settings', icon: <SystemIcon /> },
];

export default function AffiliateLayout() {
  return <StaffShell portal="Affiliate portal" tone="affiliate" nav={AFFILIATE_NAV} />;
}
