import { Injectable, NotFoundException } from '@nestjs/common';
import type { Webinar, WebinarRegistration } from '@prisma/client';
import type { LearnerWebinar, PublicWebinar, WebinarAgendaItem } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Public webinar catalog (replaces apps/web/src/data/webinars.ts as the
 * source of truth for the public /webinar page) plus a learner's own
 * registrations (`/me/webinars`). Admin CRUD lives in
 * admin/admin-webinars.*; confirmation/reminder emails live in
 * webinar-notifications.service.ts.
 */
@Injectable()
export class WebinarsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PublicWebinar[]> {
    const rows = await this.prisma.webinar.findMany({
      orderBy: [{ featured: 'desc' }, { startsAt: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(toPublic);
  }

  async getBySlug(slug: string): Promise<PublicWebinar> {
    const row = await this.prisma.webinar.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('Webinar not found.');
    return toPublic(row);
  }

  /**
   * Matched by email, case-insensitively -- registration is a public,
   * no-login-required form (see forms/webinar/webinar.service.ts), so
   * there's no userId to join on. A registration made with a different
   * email than the learner's own account simply won't show here; that's a
   * known, accepted limitation, not a bug.
   */
  async myWebinars(email: string | undefined): Promise<LearnerWebinar[]> {
    if (!email) return [];
    const rows = await this.prisma.webinarRegistration.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { webinar: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.filter((r) => r.webinar).map((r) => toLearnerWebinar(r, r.webinar!));
  }
}

function toPublic(w: Webinar): PublicWebinar {
  return {
    id: w.id,
    slug: w.slug,
    title: w.title,
    heroHeadline: w.heroHeadline,
    kicker: w.kicker,
    summary: w.summary,
    description: w.description,
    startsAt: w.startsAt?.toISOString() ?? null,
    scheduleNote: w.scheduleNote,
    durationLabel: w.durationLabel,
    timezoneNote: w.timezoneNote,
    platform: w.platform,
    language: w.language,
    seatsLimited: w.seatsLimited,
    agenda: (w.agenda as unknown as WebinarAgendaItem[]) ?? [],
    audience: w.audience,
    image: w.image,
    videoUrl: w.videoUrl,
    videoThumbnail: w.videoThumbnail,
    status: w.status,
    featured: w.featured,
  };
}

/** Attended (admin-marked) > past-and-missed (startsAt has passed, never marked attended) > upcoming. */
function toLearnerWebinar(r: WebinarRegistration, w: Webinar): LearnerWebinar {
  const status: LearnerWebinar['status'] = r.attendedAt
    ? 'attended'
    : w.startsAt && w.startsAt.getTime() < Date.now()
      ? 'missed'
      : 'upcoming';
  return {
    id: r.id,
    webinarSlug: w.slug,
    title: w.title,
    startsAt: w.startsAt?.toISOString() ?? null,
    status,
    joinUrl: w.joinUrl,
  };
}
