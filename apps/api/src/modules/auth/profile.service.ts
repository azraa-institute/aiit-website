import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma, Profile } from '@prisma/client';
import type { Me } from '@aiit/shared';

/**
 * The fields that must be non-empty before `profileComplete` is true --
 * deliberately the minimal set (name, a phone number, country, highest
 * qualification), not everything the onboarding wizard collects. University,
 * field of study, current status, learning goals, areas of interest, state,
 * city, address, postal code and time zone are all real wizard steps but stay
 * non-gating, per the learner-onboarding redesign's data-minimization
 * tiers -- collecting them helps personalize the experience, but withholding
 * them shouldn't lock someone out of the portal.
 *
 * `phone` is required here but its *verification* (phoneVerifiedAt) is
 * deliberately NOT -- Twilio needs a paid Messaging Service to actually
 * deliver the SMS-OTP, which is paused for now (see infra doc), so
 * completeness only checks that a number was entered, not confirmed.
 * confirmPhoneVerification()/POST /me/phone/confirm below stay in place
 * for whenever Twilio is enabled; they just don't gate completeness today.
 *
 * Local to this service (not the shared package) since it's the only
 * consumer -- the frontend just reads the computed `profileComplete`
 * boolean below, it never needs the list itself. `@aiit/shared` is
 * type-only by convention (see its package.json); keeping a real runtime
 * array out of it avoids being the first thing to break that.
 */
const PROFILE_COMPLETION_FIELDS = [
  'name',
  'phone',
  'country',
  'qualification',
] as const satisfies readonly (keyof Profile)[];
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { brandedEmailHtml } from '../../common/email/branded-email';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async getMe(userId: string, email?: string): Promise<Me> {
    const profile = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) throw new NotFoundException('Profile not found.');

    const isNewSignup = profile.welcomedAt === null && (await this.sendWelcomeEmailOnce(userId, email));

    return toMe(profile, isNewSignup);
  }

  /**
   * Fires exactly once per account, on whichever request first sees an
   * unwelcomed profile -- true for both Google OAuth and email/password
   * signups alike, since neither gets a Supabase-native welcome email
   * (Supabase's "Confirm signup" template only covers verifying the email
   * address, and Google signups skip that step entirely). The `updateMany`
   * with `welcomedAt: null` in its own `where` is the guard against a race
   * (e.g. two near-simultaneous GET /auth/me calls) sending the email
   * twice: only the call that actually flips the row from null gets count 1.
   * Returns whether *this* call was the one that won the claim -- the
   * frontend's real "just signed up" signal (replacing a former heuristic
   * based on the OAuth callback URL shape, which fired on every Google
   * login, not just the first).
   */
  private async sendWelcomeEmailOnce(userId: string, email: string | undefined): Promise<boolean> {
    const claimed = await this.prisma.profile.updateMany({
      where: { id: userId, welcomedAt: null },
      data: { welcomedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    if (!email) {
      this.logger.warn(`No email claim on JWT for user ${userId} -- skipped welcome email.`);
      return true;
    }

    const portalUrl = `${process.env.APP_URL ?? 'https://aiit.network'}/portal`;
    await this.email.send({
      to: email,
      subject: 'Welcome to AIIT',
      html: brandedEmailHtml({
        heading: 'Welcome to AIIT',
        // This only ever sends on a real first-ever signup, so "pick up
        // where you left off" never applies -- there's nothing to resume yet.
        // Second sentence mirrors the in-app welcome toast (PortalLayout.tsx)
        // and the ProfileCompletionBanner's own copy -- same message everywhere.
        intro:
          'Your account is ready. Head to your learner portal to explore courses and start learning. Please complete your profile first -- course enrollment and the rest of your portal stay locked until you do.',
        ctaLabel: 'Complete your profile',
        ctaUrl: `${portalUrl}/profile`,
        footerNote: "You're receiving this because you created an account on aiit.network.",
      }),
    });
    return true;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Me> {
    const profile = await this.prisma.profile.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.headline !== undefined && { headline: dto.headline }),
        // Changing the phone number invalidates any previous verification --
        // the new number hasn't been through POST /me/phone/confirm yet.
        // Only clear it when phone is actually changing, not on every PATCH
        // that happens to omit phone (undefined) or resend the same value.
        ...(dto.phone !== undefined && { phone: dto.phone, phoneVerifiedAt: null }),
        ...(dto.qualification !== undefined && { qualification: dto.qualification }),
        ...(dto.university !== undefined && { university: dto.university }),
        ...(dto.fieldOfStudy !== undefined && { fieldOfStudy: dto.fieldOfStudy }),
        ...(dto.currentStatus !== undefined && { currentStatus: dto.currentStatus }),
        ...(dto.learningGoal !== undefined && { learningGoal: dto.learningGoal }),
        ...(dto.areasOfInterest !== undefined && { areasOfInterest: dto.areasOfInterest }),
        ...(dto.timeZone !== undefined && { timeZone: dto.timeZone }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.avatarKey !== undefined && { avatarKey: dto.avatarKey }),
      },
    });
    return toMe(profile, false);
  }

  /**
   * Marks the profile's phone as verified -- but only after checking the
   * *auth* user's own phone_confirmed_at via the Supabase Admin API first
   * (same admin-fetch pattern as banSupabaseUser below). A client calling
   * this endpoint can't just claim verification: the phone on the auth user
   * must actually be confirmed AND match what's on the profile, or this
   * throws instead of silently no-op'ing (so the frontend can tell the
   * learner what went wrong rather than looking like nothing happened).
   */
  async confirmPhoneVerification(userId: string): Promise<Me> {
    const profile = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) throw new NotFoundException('Profile not found.');
    if (!profile.phone) {
      throw new BadRequestException('Set a phone number before confirming verification.');
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException('Phone verification is not configured on this server.');
    }

    const res = await fetch(new URL(`/auth/v1/admin/users/${userId}`, supabaseUrl), {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Failed to fetch Supabase auth user ${userId} (${res.status}): ${body}`);
      throw new BadRequestException('Could not verify phone number right now -- try again shortly.');
    }
    const authUser = (await res.json()) as { phone?: string; phone_confirmed_at?: string | null };

    if (!authUser.phone_confirmed_at || authUser.phone !== profile.phone.replace(/^\+/, '')) {
      throw new BadRequestException(
        'This phone number has not been verified yet -- request and enter the SMS code first.',
      );
    }

    const updated = await this.prisma.profile.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date(authUser.phone_confirmed_at) },
    });
    return toMe(updated, false);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<Me> {
    const profile = await this.prisma.profile.update({
      where: { id: userId },
      data: { preferences: dto.preferences as Prisma.InputJsonValue },
    });
    return toMe(profile, false);
  }

  /** Soft: marks the account for deletion. A purge job is future work. */
  async requestDeletion(userId: string, email: string | undefined): Promise<void> {
    await this.prisma.profile.update({
      where: { id: userId },
      data: { status: 'pending_deletion', deletionRequestedAt: new Date() },
    });

    if (email) {
      await this.email.send({
        to: email,
        subject: 'Your AIIT account has been deleted',
        html: brandedEmailHtml({
          heading: 'Account deleted',
          intro:
            'Your AIIT account has been deleted, as you requested. You will no longer be able to sign in.',
          ctaLabel: 'Visit AIIT',
          ctaUrl: process.env.APP_URL ?? 'https://aiit.network',
          footerNote: "If you didn't request this, contact us immediately at info@aiit.network.",
        }),
      });
    }

    await this.banSupabaseUser(userId);
  }

  /**
   * Disables the account's actual Supabase session, on top of (not instead
   * of) JwtGuard's own status check -- that check is the real, always-on
   * enforcement regardless of whether this call succeeds; this just closes
   * the narrower gap where a *fresh* sign-in attempt would otherwise still
   * succeed at Supabase's layer and land briefly on /portal before the
   * first API call bounces it. Best-effort like EmailService: never throws,
   * since the profile is already correctly marked pending_deletion above
   * and JwtGuard already blocks it either way -- losing this extra step
   * shouldn't fail the whole deletion request.
   *
   * ban_duration accepts a Go duration string; there's no literal
   * "forever", so this uses Supabase's own documented example for an
   * effectively-permanent ban. (Unbanning, if an admin-restore flow is
   * ever built, is the same call with ban_duration: "none" -- not needed
   * anywhere in this codebase today.)
   */
  private async banSupabaseUser(userId: string): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.warn(
        `SUPABASE_SERVICE_ROLE_KEY not set -- account ${userId} marked pending_deletion, but its live Supabase session was not banned (JwtGuard's status check still blocks API access either way).`,
      );
      return;
    }

    try {
      const res = await fetch(new URL(`/auth/v1/admin/users/${userId}`, supabaseUrl), {
        method: 'PUT',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ban_duration: '876000h' }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Failed to ban Supabase user ${userId} (${res.status}): ${body}`);
      }
    } catch (error) {
      this.logger.error(
        `Error banning Supabase user ${userId}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // notifyPasswordChanged and notify2faEnabled used to live here -- removed
  // in favor of Supabase's own native "Security" notification emails
  // (Dashboard -> Authentication -> Emails -> Security), which cover both
  // events (and more) more robustly: they fire on the real GoTrue event
  // itself, not only on the specific frontend call sites this app happened
  // to wire, so e.g. a password changed some other way still notifies the
  // user. requestDeletion's email stays custom below -- deletion is a soft
  // flag in this app's own database, not a real Supabase user deletion, so
  // there's no native event to hook for it.

  /**
   * Backs ForgotPasswordPage's "no account found" message. auth.users isn't
   * a Prisma model (Supabase-managed, see schema.prisma), hence the raw
   * query -- Prisma parameterizes the interpolated value in a tagged
   * template, so this isn't string-built SQL. Deliberately case-insensitive
   * since Supabase itself treats email as case-insensitive for sign-in.
   *
   * This is a real, if narrow, email-enumeration surface -- tightly
   * throttled at the controller for that reason. Accepted for this app:
   * RegisterPage already reveals "already registered" on a duplicate
   * signup attempt, so withholding the same signal here wouldn't actually
   * stop anyone determined to check, just make the honest, no-account
   * case more confusing for real users who mistype their email.
   */
  async emailExists(email: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = lower(${email})) AS exists
    `;
    return rows[0]?.exists ?? false;
  }
}

function toMe(profile: Profile, isNewSignup: boolean): Me {
  return {
    id: profile.id,
    role: profile.role,
    status: profile.status,
    name: profile.name,
    headline: profile.headline,
    phone: profile.phone,
    phoneVerifiedAt: profile.phoneVerifiedAt?.toISOString() ?? null,
    qualification: profile.qualification,
    university: profile.university,
    fieldOfStudy: profile.fieldOfStudy,
    currentStatus: profile.currentStatus,
    learningGoal: profile.learningGoal,
    areasOfInterest: profile.areasOfInterest,
    timeZone: profile.timeZone,
    country: profile.country,
    state: profile.state,
    city: profile.city,
    address: profile.address,
    postalCode: profile.postalCode,
    avatarKey: profile.avatarKey,
    preferences: profile.preferences as Record<string, unknown>,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    isNewSignup,
    profileComplete: PROFILE_COMPLETION_FIELDS.every((field) => Boolean(profile[field])),
  };
}
