import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma, Profile } from '@prisma/client';
import type { Me } from '@aiit/shared';
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
        intro: 'Your account is ready. Head to your learner portal to explore courses and start learning.',
        ctaLabel: 'Go to your portal',
        ctaUrl: portalUrl,
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
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.avatarKey !== undefined && { avatarKey: dto.avatarKey }),
      },
    });
    return toMe(profile, false);
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

  /**
   * Called by the frontend right after a password change succeeds --
   * ResetPasswordPage (via a recovery-link session) and SettingsPage (a
   * logged-in user changing it directly) both call supabase.auth.updateUser
   * client-side with no backend involvement, so there's no natural
   * server-side hook for "a password just changed"; this is the deliberate
   * substitute. Best-effort like the welcome email: EmailService no-ops
   * with a logged warning if it fails, never throws.
   */
  async notifyPasswordChanged(email: string | undefined): Promise<void> {
    if (!email) return;
    await this.email.send({
      to: email,
      subject: 'Your AIIT password was changed',
      html: brandedEmailHtml({
        heading: 'Password changed',
        intro: 'The password on your AIIT account was just changed. If this was you, no action is needed.',
        ctaLabel: 'Review your account',
        ctaUrl: `${process.env.APP_URL ?? 'https://aiit.network'}/portal/settings`,
        footerNote: "If you didn't make this change, reset your password immediately and contact us at info@aiit.network.",
      }),
    });
  }

  /**
   * Called by the frontend right after enrolling a TOTP factor succeeds
   * (SecurityFactorsSection's handleVerify) -- 2FA enrollment happens
   * entirely client-side via supabase.auth.mfa.*, with no backend
   * involvement, so same as notifyPasswordChanged, this is the deliberate
   * substitute for a server-side hook that doesn't exist. Best-effort:
   * EmailService no-ops with a logged warning if it fails, never throws.
   */
  async notify2faEnabled(email: string | undefined): Promise<void> {
    if (!email) return;
    await this.email.send({
      to: email,
      subject: 'Two-factor authentication enabled on your AIIT account',
      html: brandedEmailHtml({
        heading: 'Two-factor authentication enabled',
        intro:
          "You'll now be asked for a code from your authenticator app each time you sign in to AIIT. If this wasn't you, remove the authenticator in Account Settings and contact us.",
        ctaLabel: 'Review your account',
        ctaUrl: `${process.env.APP_URL ?? 'https://aiit.network'}/portal/settings`,
        footerNote: "If you didn't enable this, contact us immediately at info@aiit.network.",
      }),
    });
  }

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
    country: profile.country,
    avatarKey: profile.avatarKey,
    preferences: profile.preferences as Record<string, unknown>,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    isNewSignup,
  };
}
