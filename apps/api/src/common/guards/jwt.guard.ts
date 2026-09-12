import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createPublicKey, verify as verifySignature } from 'crypto';
import type { webcrypto } from 'crypto';
import type { Request } from 'express';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
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
  private jwksCache: SupabaseJwk[] | undefined;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    const sub = await this.verifyAndExtractSubject(token);

    const profile = await this.prisma.profile.findUnique({
      where: { id: sub },
      select: { role: true },
    });
    if (!profile) {
      throw new UnauthorizedException('No profile found for this account.');
    }

    request.user = { userId: sub, role: profile.role };
    return true;
  }

  private async verifyAndExtractSubject(token: string): Promise<string> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    let header: { alg?: string; kid?: string };
    let payload: { sub?: string; exp?: number };
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

    return payload.sub;
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
