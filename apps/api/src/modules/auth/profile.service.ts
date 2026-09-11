import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Profile } from '@prisma/client';
import type { Me } from '@aiit/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<Me> {
    const profile = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) throw new NotFoundException('Profile not found.');
    return toMe(profile);
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
