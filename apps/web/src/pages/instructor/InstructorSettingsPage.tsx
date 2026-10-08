import { StaffAccountSettings } from '@/components/staff/StaffAccountSettings';

export default function InstructorSettingsPage() {
  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">Account</p>
          <h1 className="adm-title">Settings</h1>
          <p className="adm-intro">Manage your instructor account&apos;s sign-in and security.</p>
        </div>
      </div>
      <StaffAccountSettings />
    </div>
  );
}
