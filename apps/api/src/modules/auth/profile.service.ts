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

    if (!profile.welcomedAt) {
      await this.sendWelcomeEmailOnce(userId, email);
    }

    return toMe(profile);
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
   */
  private async sendWelcomeEmailOnce(userId: string, email: string | undefined): Promise<void> {
    const claimed = await this.prisma.profile.updateMany({
      where: { id: userId, welcomedAt: null },
      data: { welcomedAt: new Date() },
    });
    if (claimed.count === 0) return;

    if (!email) {
      this.logger.warn(`No email claim on JWT for user ${userId} -- skipped welcome email.`);
      return;
    }

    const portalUrl = `${process.env.APP_URL ?? 'https://aiit.network'}/portal`;
    await this.email.send({
      to: email,
      subject: 'Welcome to AIIT',
      html: brandedEmailHtml({
        heading: 'Welcome to AIIT',
        intro:
          "Your account is ready. Head to your learner portal to explore courses, track assignments, and pick up where you left off.",
        ctaLabel: 'Go to your portal',
        ctaUrl: portalUrl,
        footerNote: "You're receiving this because you created an account on aiit.network.",
      }),
    });
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
    return toMe(profile);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<Me> {
    const profile = await this.prisma.profile.update({
      where: { id: userId },
      data: { preferences: dto.preferences as Prisma.InputJsonValue },
    });
    return toMe(profile);
  }

  /** Soft: marks the account for deletion. A purge job is future work. */
  async requestDeletion(userId: string): Promise<void> {
    await this.prisma.profile.update({
      where: { id: userId },
      data: { status: 'pending_deletion', deletionRequestedAt: new Date() },
    });
  }
}

function toMe(profile: Profile): Me {
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
  };
}
