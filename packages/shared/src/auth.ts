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
  /** Discipline/major -- free text. */
  fieldOfStudy: string | null;
  /** Student / working professional / job seeker / other -- free text, UI offers a fixed picklist. */
  currentStatus: string | null;
  /** Primary reason for joining -- free text, UI offers a fixed picklist plus "Other". */
  learningGoal: string | null;
  /** Learning-area interest cards the learner selected (see data/learningAreas.ts on the frontend). */
  areasOfInterest: string[];
  /** IANA time zone, e.g. "Africa/Lagos" -- client-detected default, editable. */
  timeZone: string | null;
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
  /** True once name/phone/country/qualification are all set -- the minimal required tier, computed server-side on every read (see ProfileService.toMe), never stored, so it can't go stale. Every other profile field (university, field of study, current status, learning goals, areas of interest, city, address, postal code, time zone) is collectible but non-gating. */
  profileComplete: boolean;
}
