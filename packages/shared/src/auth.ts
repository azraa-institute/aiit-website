export type UserRole = 'learner' | 'admin' | 'instructor';
export type ProfileStatus = 'active' | 'suspended' | 'pending_deletion';

/** GET /auth/me response shape. */
export interface Me {
  id: string;
  role: UserRole;
  status: ProfileStatus;
  name: string | null;
  headline: string | null;
  /** E.164 format once set. Not itself proof of verification -- see phoneVerifiedAt. */
  phone: string | null;
  /** Set only by POST /me/phone/confirm, after checking the *auth* user's phone_confirmed_at via the Supabase Admin API. Cleared whenever `phone` changes. */
  phoneVerifiedAt: string | null;
  /** Highest qualification -- free text; the frontend offers a fixed picklist plus "Other". */
  qualification: string | null;
  /** Institution attended -- AIIT is not itself an accredited university; this is the learner's own prior/current one. */
  university: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  avatarKey: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** True only on the exact GET /auth/me call that just fired the one-time welcome email -- i.e. a real first-ever signup, for either Google or email/password. False on every later call. */
  isNewSignup: boolean;
  /** True once name/phone(+verified)/country/city/address/postalCode/qualification/university are all set -- computed server-side on every read (see ProfileService.toMe), never stored, so it can't go stale. */
  profileComplete: boolean;
}
