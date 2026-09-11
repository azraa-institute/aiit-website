import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import type { Request } from 'express';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface SupabaseAccessTokenPayload {
  sub: string;
  exp: number;
}

/**
 * Verifies the Supabase-issued JWT (signature + expiry), then looks up the
 * caller's role from `profiles` -- NOT from the JWT's own "role" claim,
 * which is the Postgres role (anon/authenticated/service_role), not our
 * app-level Role enum.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Auth is not configured.');
    }

    let payload: SupabaseAccessTokenPayload;
    try {
      payload = verify(token, secret, { algorithms: ['HS256'] }) as SupabaseAccessTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: payload.sub },
      select: { role: true },
    });
    if (!profile) {
      throw new UnauthorizedException('No profile found for this account.');
    }

    request.user = { userId: payload.sub, role: profile.role };
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
