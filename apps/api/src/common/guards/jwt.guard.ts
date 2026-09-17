import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createPublicKey, verify as verifySignature } from 'crypto';
import type { webcrypto } from 'crypto';
import type { Request } from 'express';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  /** From the JWT's own `email` claim -- always present for the email/password and Google sign-in flows this project supports. */
  email?: string;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface SupabaseJwk extends webcrypto.JsonWebKey {
  kid?: string;
}

interface Jwks {
  keys: SupabaseJwk[];
}

/** Verification recipe per JWT `alg` -- the digest name and, for EC keys, the DER-vs-raw signature encoding `crypto.verify` needs to be told about explicitly. */
const SUPPORTED_ALGS: Record<string, { digest: string; dsaEncoding?: 'ieee-p1363' }> = {
  ES256: { digest: 'sha256', dsaEncoding: 'ieee-p1363' },
  RS256: { digest: 'RSA-SHA256' },
};

/**
 * Verifies the Supabase-issued JWT, then looks up the caller's role from
 * `profiles` -- NOT from the JWT's own "role" claim, which is the Postgres
 * role (anon/authenticated/service_role), not our app-level Role enum.
 *
 * Supabase signs access tokens with its project's asymmetric JWT signing
 * key (ES256 for this project), not a shared secret -- so verification
 * fetches the project's public JWKS endpoint and checks the signature
 * against the matching key by `kid`, re-fetching once if an unseen `kid`
 * shows up (handles key rotation). Done with Node's built-in `crypto`
 * rather than a JWT library: every JWT/JWKS library available at the time
 * this was written ships ESM-only, which this project's CommonJS build
 * can't `require()`.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);
  private jwksCache: SupabaseJwk[] | undefined;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    const { sub, email, aal } = await this.verifyAndExtractSubject(token);

    const profile = await this.prisma.profile.findUnique({
      where: { id: sub },
      select: { role: true, status: true },
    });
    // A profile row is never actually erased by the app's own deletion flow
    // (see ProfileService.requestDeletion) -- it's a soft flag, kept as an
    // internal record. A missing row here means something removed it
    // out-of-band (e.g. a direct DELETE against the database) -- from the
    // caller's perspective that's indistinguishable from "deleted", so it
    // gets the same ForbiddenException + message as the soft-delete case
    // below. The frontend's handleErrorResponse() matches on that exact
    // message to sign the caller out; a distinct exception here would
    // silently skip that and leave a hard-deleted user's tab stuck signed
    // in against a 401 it doesn't know how to handle.
    if (!profile || profile.status !== 'active') {
      throw new ForbiddenException('This account has been deleted.');
    }

    // MfaChallenge (frontend) is only a UX gate -- it stops the sign-in
    // *flow* from reaching /portal, but a request already holding a valid
    // aal1 token could otherwise call the API directly without ever
    // completing the second factor. This is the real enforcement: mirrors
    // Supabase's own documented MFA-via-RLS pattern, just applied here
    // instead of in an RLS policy, since this API connects with the
    // service-role connection where RLS is defense-in-depth, not the real
    // gate (same as every other RLS policy in this codebase).
    if (aal !== 'aal2' && (await this.requiresAal2(sub))) {
      throw new UnauthorizedException('This account requires two-factor verification for this session.');
    }

    request.user = { userId: sub, role: profile.role, email };
    return true;
  }

  /**
   * Fails OPEN (treats the account as not requiring aal2) if the query
   * itself errors -- e.g. a permissions issue on auth.mfa_factors that
   * differs from the grants already proven to work on auth.users. The
   * alternative, failing closed, would turn any transient problem with
   * this one narrow check into a full outage for every authenticated
   * request, not just the aal2 one it protects.
   */
  /**
   * Best-effort identification for an endpoint that works for both
   * signed-in and anonymous callers (e.g. cookie-consent logging) --
   * unlike canActivate(), this never throws. Any failure (no header,
   * expired, bad signature, no profile, deleted account) is treated
   * identically as "anonymous", since there's no 401 response here to
   * distinguish them for. Deliberately skips the aal2 MFA check
   * canActivate() does -- that guards access to sensitive account
   * actions, which this endpoint isn't.
   */
  async tryIdentify(request: Request): Promise<AuthenticatedUser | null> {
    try {
      const token = extractBearerToken(request.headers.authorization);
      if (!token) return null;

      const { sub, email } = await this.verifyAndExtractSubject(token);
      const profile = await this.prisma.profile.findUnique({
        where: { id: sub },
        select: { role: true, status: true },
      });
      if (!profile || profile.status !== 'active') return null;

      return { userId: sub, role: profile.role, email };
    } catch {
      return null;
    }
  }

  private async requiresAal2(userId: string): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRaw<{ has_verified_factor: boolean }[]>`
        SELECT EXISTS(
          SELECT 1 FROM auth.mfa_factors WHERE user_id = ${userId} AND status = 'verified'
        ) AS has_verified_factor
      `;
      return rows[0]?.has_verified_factor ?? false;
    } catch (error) {
      this.logger.error(
        `Could not check auth.mfa_factors for user ${userId} -- treating this request as if no MFA factor is enrolled.`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  private async verifyAndExtractSubject(token: string): Promise<{ sub: string; email?: string; aal?: string }> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    let header: { alg?: string; kid?: string };
    let payload: { sub?: string; exp?: number; email?: string; aal?: string };
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    const alg = header.alg ? SUPPORTED_ALGS[header.alg] : undefined;
    if (!alg || !header.kid || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    const jwk = await this.getKey(header.kid);
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });

    const verified = verifySignature(
      alg.digest,
      Buffer.from(`${headerB64}.${payloadB64}`),
      alg.dsaEncoding ? { key: publicKey, dsaEncoding: alg.dsaEncoding } : publicKey,
      Buffer.from(signatureB64, 'base64url'),
    );
    if (!verified) {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    return { sub: payload.sub, email: payload.email, aal: payload.aal };
  }

  private async getKey(kid: string): Promise<SupabaseJwk> {
    if (!this.jwksCache?.some((k) => k.kid === kid)) {
      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        throw new UnauthorizedException('Auth is not configured.');
      }
      const res = await fetch(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl));
      if (!res.ok) {
        throw new UnauthorizedException('Auth is not configured.');
      }
      const jwks = (await res.json()) as Jwks;
      this.jwksCache = jwks.keys;
    }

    const key = this.jwksCache.find((k) => k.kid === kid);
    if (!key) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    return key;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
