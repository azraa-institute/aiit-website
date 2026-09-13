export type UserRole = 'learner' | 'admin' | 'instructor';
export type ProfileStatus = 'active' | 'suspended' | 'pending_deletion';

/** GET /auth/me response shape. */
export interface Me {
  id: string;
  role: UserRole;
  status: ProfileStatus;
  name: string | null;
  headline: string | null;
  /** Plain contact-info string -- not validated as a real phone number, no phone-based sign-in or verification anywhere in this app. */
  phone: string | null;
  country: string | null;
  avatarKey: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** True only on the exact GET /auth/me call that just fired the one-time welcome email -- i.e. a real first-ever signup, for either Google or email/password. False on every later call. */
  isNewSignup: boolean;
}
