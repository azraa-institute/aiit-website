export type UserRole = 'learner' | 'admin' | 'instructor';
export type ProfileStatus = 'active' | 'suspended' | 'pending_deletion';

/** GET /auth/me response shape. */
export interface Me {
  id: string;
  role: UserRole;
  status: ProfileStatus;
  name: string | null;
  headline: string | null;
  country: string | null;
  avatarKey: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
