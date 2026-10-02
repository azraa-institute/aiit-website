import { randomBytes } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import type { Affiliate } from '@prisma/client';
import type { AffiliateMe, AffiliateType } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

export interface ApplyContext {
  phone?: string;
  handle?: string;
  country?: string;
  city?: string;
  source?: string;
}

const EMPTY_ME: AffiliateMe = {
  hasApplied: false,
  type: null,
  applicationStatus: null,
  rejectionReason: null,
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
  ) {}

  async apply(userId: string, type: AffiliateType, context: ApplyContext = {}): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate
      .create({ data: { userId, type, referralSlug: generateReferralSlug(), ...context } })
      .catch((err: unknown) => {
        // Either this user already has a row, or (astronomically less likely) the
        // random slug collided -- either way it's a conflict the caller should
        // see as "you've already applied" rather than a 500.
        if ((err as { code?: string }).code === 'P2002') {
          throw new ConflictException('You have already applied to the affiliate program.');
        }
        throw err;
      });
    await this.audit.record(userId, 'affiliate.apply', 'affiliate', affiliate.id, { type });
    return this.toMe(affiliate);
  }

  async me(userId: string): Promise<AffiliateMe> {
    const affiliate = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) return EMPTY_ME;
    return this.toMe(affiliate);
  }

  private async toMe(affiliate: Affiliate): Promise<AffiliateMe> {
    const approved = affiliate.applicationStatus === 'approved';
    return {
      hasApplied: true,
      type: affiliate.type,
      applicationStatus: affiliate.applicationStatus,
      rejectionReason: affiliate.rejectionReason,
      referralLink: approved ? `${webOrigin()}/r/${affiliate.referralSlug}` : null,
      registrationCount: approved
        ? await this.prisma.profile.count({ where: { referredByAffiliateId: affiliate.id } })
        : null,
    };
  }
}

function generateReferralSlug(): string {
  return randomBytes(5).toString('hex');
}

function webOrigin(): string {
  return process.env.APP_URL ?? 'https://aiit.network';
}
