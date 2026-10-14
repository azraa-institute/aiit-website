import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Webinar } from '@prisma/client';
import type {
  AdminWebinar,
  AdminWebinarRegistrant,
  AdminWebinarSummary,
  WebinarAgendaItem,
  WebinarReminderResult,
} from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { WebinarNotificationsService } from '../webinars/webinar-notifications.service';
import type { WebinarInputDto } from './dto/admin-webinar.dto';

@Injectable()
export class AdminWebinarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: WebinarNotificationsService,
  ) {}

  async list(): Promise<AdminWebinarSummary[]> {
    const rows = await this.prisma.webinar.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { registrations: true } } },
    });
    return rows.map((w) => ({
      id: w.id,
      slug: w.slug,
      title: w.title,
      startsAt: w.startsAt?.toISOString() ?? null,
      status: w.status,
      featured: w.featured,
      registrationCount: w._count.registrations,
      updatedAt: w.updatedAt.toISOString(),
    }));
  }

  async get(id: string): Promise<AdminWebinar> {
    const row = await this.findOrThrow(id);
    return toDetail(row);
  }

  async create(dto: WebinarInputDto): Promise<AdminWebinar> {
    const row = await this.prisma.webinar
      .create({ data: toData(dto) })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') throw new ConflictException('A webinar with that slug already exists.');
        throw err;
      });
    return toDetail(row);
  }

  async update(id: string, dto: WebinarInputDto): Promise<AdminWebinar> {
    await this.findOrThrow(id);
    const row = await this.prisma.webinar
      .update({ where: { id }, data: toData(dto) })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002') throw new ConflictException('A webinar with that slug already exists.');
        throw err;
      });
    return toDetail(row);
  }

  async remove(adminId: string, id: string): Promise<void> {
    const row = await this.findOrThrow(id);
    await this.prisma.webinar.delete({ where: { id } });
    await this.audit.record(adminId, 'webinar.delete', 'webinar', id, { slug: row.slug });
  }

  async registrants(id: string): Promise<AdminWebinarRegistrant[]> {
    await this.findOrThrow(id);
    const rows = await this.prisma.webinarRegistration.findMany({
      where: { webinarId: id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      whatsapp: r.whatsapp,
      region: r.region,
      persona: r.persona,
      attendedAt: r.attendedAt?.toISOString() ?? null,
      confirmationSentAt: r.confirmationSentAt?.toISOString() ?? null,
      reminder24hSentAt: r.reminder24hSentAt?.toISOString() ?? null,
      reminder30mSentAt: r.reminder30mSentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async markAttended(adminId: string, registrationId: string, attended: boolean): Promise<void> {
    const reg = await this.prisma.webinarRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found.');
    await this.prisma.webinarRegistration.update({
      where: { id: registrationId },
      data: { attendedAt: attended ? new Date() : null },
    });
    await this.audit.record(adminId, attended ? 'webinar.mark_attended' : 'webinar.unmark_attended', 'webinar_registration', registrationId, {});
  }

  /** Manual "send now" -- always forces a resend, regardless of what the automatic sweep has already sent (see WebinarReminderCronService for the real mechanism). */
  async sendReminderNow(adminId: string, id: string, kind: '24h' | '30m'): Promise<WebinarReminderResult> {
    await this.findOrThrow(id);
    const sentCount = await this.notifications.sendReminders(id, kind, { force: true });
    await this.audit.record(adminId, 'webinar.send_reminder', 'webinar', id, { kind, sentCount });
    return { kind, sentCount };
  }

  private async findOrThrow(id: string): Promise<Webinar> {
    const row = await this.prisma.webinar.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Webinar not found.');
    return row;
  }
}

function toData(dto: WebinarInputDto) {
  return {
    slug: dto.slug,
    title: dto.title,
    heroHeadline: dto.heroHeadline,
    kicker: dto.kicker,
    summary: dto.summary,
    description: dto.description,
    startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
    scheduleNote: dto.scheduleNote,
    durationLabel: dto.durationLabel,
    timezoneNote: dto.timezoneNote,
    platform: dto.platform,
    language: dto.language,
    seatsLimited: dto.seatsLimited,
    agenda: dto.agenda as unknown as Prisma.InputJsonValue,
    audience: dto.audience,
    image: dto.image,
    videoUrl: dto.videoUrl ?? null,
    videoThumbnail: dto.videoThumbnail ?? null,
    joinUrl: dto.joinUrl ?? null,
    status: dto.status,
    featured: dto.featured,
  };
}

function toDetail(w: Webinar): AdminWebinar {
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
    joinUrl: w.joinUrl,
    status: w.status,
    featured: w.featured,
    createdAt: w.createdAt.toISOString(),
  };
}
