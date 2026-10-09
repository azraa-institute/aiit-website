import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Affiliate } from '@prisma/client';
import type { AffiliateMe, AffiliateType } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { EmailService } from '../../common/email/email.service';
import { brandedEmailHtml } from '../../common/email/branded-email';
import { SupabaseAdminService, generateTemporaryPassword } from '../../common/supabase-admin/supabase-admin.service';
import { AFFILIATE_AGREEMENT_VERSION } from './affiliate-agreement';
import type { ApplyNewAffiliateDto } from './dto/apply-new-affiliate.dto';

export interface ApplyContext {
  phone?: string;
  handle?: string;
  country?: string;
  state?: string;
  city?: string;
  source?: string;
  motivation?: string;
}

const EMPTY_ME: AffiliateMe = {
  hasApplied: false,
  type: null,
  applicationStatus: null,
  rejectionReason: null,
  activated: false,
  referralLink: null,
  registrationCount: null,
};

/**
 * Self-service affiliate application + the applicant's own status view.
 * Deliberately not role-gated (no @Roles here) -- any signed-in account can
 * apply, including an existing learner, and affiliate-ness is tracked by
 * whether an Affiliate row exists for this user, not by their Profile.role.
 * See the schema.prisma comment on the Affiliate model for why.
 */
@Injectable()
export class AffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly supabase: SupabaseAdminService,
  ) {}

  /** An already-logged-in account applying -- no password to issue, they already have one. */
  async apply(
    userId: string,
    type: AffiliateType,
    signedName: string,
    signedIp: string | undefined,
    context: ApplyContext = {},
  ): Promise<AffiliateMe> {
    const affiliate = await this.createRow(userId, type, signedName, signedIp, context);
    await this.audit.record(userId, 'affiliate.apply', 'affiliate', affiliate.id, { type });
    return this.toMe(affiliate);
  }

  /**
   * A brand-new, anonymous applicant -- no session, no password of their
   * own choosing. Creates the Supabase account server-side (pre-confirmed,
   * via the admin API -- no email-confirmation-link detour) with a random
   * one-time password, flags it mustChangePassword, then emails that
   * password plus a separate reference code (see activate()) to the
   * address they gave us. Mirrors AdminUsersService.createInstructor()'s
   * shape -- same "upsert the Profile the on_auth_user_created trigger
   * already inserted" pattern. If they arrived via a /r/:slug referral
   * link, dto.referralSlug carries that through to the trigger too (as
   * `referral_slug` in Supabase's own user_metadata), the same way
   * RegisterPage.tsx's client-side signUp() already does -- so the new
   * Profile.referredByAffiliateId still gets set even though this account
   * is created server-side, not via the client signUp() path.
   */
  async applyNew(dto: ApplyNewAffiliateDto, signedIp: string | undefined): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const password = generateTemporaryPassword();
    const referralSlug = dto.referralSlug?.trim();
    const userId = await this.supabase.createUser(
      email,
      password,
      name,
      referralSlug ? { referral_slug: referralSlug } : undefined,
    );

    await this.prisma.profile.upsert({
      where: { id: userId },
      create: { id: userId, name, mustChangePassword: true },
      update: { name, mustChangePassword: true },
    });

    const { type, signedName, phone, handle, country, state, city, source, motivation } = dto;
    const affiliate = await this.createRow(userId, type, signedName, signedIp, {
      phone,
      handle,
      country,
      state,
      city,
      source,
      motivation,
    });
    await this.audit.record(userId, 'affiliate.apply_new', 'affiliate', affiliate.id, { type, email });

    const loginUrl = `${webOrigin()}/login`;
    await this.email.send({
      to: email,
      subject: 'Your AIIT affiliate login',
      html: brandedEmailHtml({
        heading: 'Your AIIT affiliate login',
        intro:
          "Your application is in. Here's what you need to sign in -- you'll be asked to set your own password the moment you do.",
        bodyHtml: credentialsBlockHtml([
          { label: 'Email', value: email },
          { label: 'Temporary password', value: password },
          { label: 'Reference code', value: affiliate.referenceCode ?? '' },
        ]),
        ctaLabel: 'Log in to AIIT',
        ctaUrl: loginUrl,
        footerNote:
          "You're receiving this because you applied to the AIIT affiliate program. Keep your reference code -- you'll use it to activate your referral link once your application is approved.",
      }),
    });
  }

  async me(userId: string): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) return EMPTY_ME;
    return this.toMe(affiliate);
  }

  /** The caller's own signed record, for regenerating their agreement PDF on demand (GET /affiliates/me/agreement.pdf). */
  async getOwnSignedRecord(userId: string): Promise<Affiliate> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate?.signedAt) throw new NotFoundException('No signed agreement found for your account.');
    return affiliate;
  }

  /** Unlocks the referral link -- see the Affiliate.referenceCode/activatedAt schema comment. */
  async activate(userId: string, referenceCode: string): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found for your account.');
    if (affiliate.activatedAt) return this.toMe(affiliate);
    if (!affiliate.referenceCode || affiliate.referenceCode !== referenceCode.trim().toUpperCase()) {
      throw new BadRequestException('That reference code doesn’t match. Check the email we sent you and try again.');
    }
    const updated = await this.prisma.affiliate.update({ where: { userId }, data: { activatedAt: new Date() } });
    await this.audit.record(userId, 'affiliate.activate', 'affiliate', affiliate.id, {});
    return this.toMe(updated);
  }

  /** Re-sends the same stored code (never regenerates it -- a code already emailed must stay valid). */
  async resendReferenceCode(userId: string): Promise<void> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate?.referenceCode) throw new NotFoundException('No affiliate application found for your account.');
    const email = (await this.namesAndEmails([userId])).get(userId)?.email;
    if (!email) throw new NotFoundException('Could not find an email address for your account.');
    await this.email.send({
      to: email,
      subject: 'Your AIIT affiliate reference code',
      html: brandedEmailHtml({
        heading: 'Your reference code',
        intro: 'Here’s the reference code for your AIIT affiliate application, to activate your referral link once it’s approved.',
        bodyHtml: credentialsBlockHtml([{ label: 'Reference code', value: affiliate.referenceCode }]),
        ctaLabel: 'Open your affiliate dashboard',
        ctaUrl: `${webOrigin()}/affiliate-portal`,
        footerNote: "You're receiving this because you asked to resend your AIIT affiliate reference code.",
      }),
    });
  }

  private async createRow(
    userId: string,
    type: AffiliateType,
    signedName: string,
    signedIp: string | undefined,
    context: ApplyContext,
  ): Promise<Affiliate> {
    return this.prisma.affiliate
      .create({
        data: {
          userId,
          type,
          referralSlug: generateReferralSlug(),
          referenceCode: generateReferenceCode(),
          signedName: signedName.trim(),
          signedIp: signedIp ?? null,
          agreementVersion: AFFILIATE_AGREEMENT_VERSION,
          signedAt: new Date(),
          ...context,
        },
      })
      .catch((err: unknown) => {
        // Either this user already has a row, or (astronomically less likely) the
        // random slug/reference code collided -- either way it's a conflict the
        // caller should see as "you've already applied" rather than a 500.
        if ((err as { code?: string }).code === 'P2002') {
          throw new ConflictException('You have already applied to the affiliate program.');
        }
        throw err;
      });
  }

  /** Same raw-SQL lookup admin-affiliates.service.ts uses -- auth.users isn't a Prisma model, so email only ever comes from a direct query against it. */
  private async namesAndEmails(userIds: string[]): Promise<Map<string, { name: string | null; email: string | null }>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const [profiles, emails] = await Promise.all([
      this.prisma.profile.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
      this.prisma.$queryRaw<{ id: string; email: string | null }[]>`
        SELECT id, email FROM auth.users WHERE id IN (${Prisma.join(unique.map((i) => Prisma.sql`${i}::uuid`))})`,
    ]);
    const emailById = new Map(emails.map((e) => [e.id, e.email]));
    return new Map(profiles.map((p) => [p.id, { name: p.name, email: emailById.get(p.id) ?? null }]));
  }

  private async toMe(affiliate: Affiliate): Promise<AffiliateMe> {
    const approved = affiliate.applicationStatus === 'approved';
    const activated = Boolean(affiliate.activatedAt);
    return {
      hasApplied: true,
      type: affiliate.type,
      applicationStatus: affiliate.applicationStatus,
      rejectionReason: affiliate.rejectionReason,
      activated,
      referralLink: approved && activated ? `${webOrigin()}/r/${affiliate.referralSlug}` : null,
      registrationCount: approved
        ? await this.prisma.profile.count({ where: { referredByAffiliateId: affiliate.id } })
        : null,
    };
  }
}

function generateReferralSlug(): string {
  return randomBytes(5).toString('hex');
}

/** Short, typeable, visually distinct from the login password it's emailed alongside -- see the Affiliate.referenceCode schema comment. */
function generateReferenceCode(): string {
  return `AIIT-AFF-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function webOrigin(): string {
  return process.env.APP_URL ?? 'https://aiit.network';
}

function credentialsBlockHtml(rows: { label: string; value: string }[]): string {
  const cells = rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#55504a;">${label}</td>
          <td style="padding:8px 0;font-family:'Courier New',monospace;font-size:15px;font-weight:bold;color:#14110f;text-align:right;">${value}</td>
        </tr>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4efe7;border:1px solid rgba(20,17,15,0.12);border-radius:6px;padding:4px 16px;">
      ${cells}
    </table>
  `;
}
