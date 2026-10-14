import { StaffShell, type StaffNavEntry } from '@/components/staff/StaffShell';
// Reuses the admin area's tables, forms and buttons (`adm-*`); only the frame differs.
import '@/pages/admin/admin.css';

const AFFILIATE_NAV: StaffNavEntry[] = [
  { to: '/affiliate-portal', label: 'Dashboard', end: true },
  { to: '/affiliate-portal/link', label: 'Referral link' },
  { to: '/affiliate-portal/payout', label: 'Payout' },
  { to: '/affiliate-portal/settings', label: 'Settings' },
];

export default function AffiliateLayout() {
  return <StaffShell portal="Affiliate portal" tone="affiliate" nav={AFFILIATE_NAV} />;
}
