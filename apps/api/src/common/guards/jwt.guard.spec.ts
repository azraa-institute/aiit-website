import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'crypto';
import { JwtGuard } from './jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

const SUPABASE_URL = 'https://test-project.supabase.co';
const KID = 'test-kid';

function contextWithHeader(authorization?: string): ExecutionContext {
  const request = { headers: { authorization } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function signToken(
  privateKey: KeyObject,
  subject: string,
  expiresInSeconds: number,
  email?: string,
  aal?: string,
): string {
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: KID, typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + expiresInSeconds, email, aal }),
  );
  const signature = cryptoSign('sha256', Buffer.from(`${header}.${payload}`), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${payload}.${base64url(signature)}`;
}

describe('JwtGuard', () => {
  const originalUrl = process.env.SUPABASE_URL;
  let prisma: { profile: { findUnique: jest.Mock }; $queryRaw: jest.Mock };
  let guard: JwtGuard;
  let privateKey: KeyObject;
  let jwk: Record<string, unknown>;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeAll(() => {
    const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    privateKey = keyPair.privateKey;
    jwk = { ...keyPair.publicKey.export({ format: 'jwk' }), kid: KID, use: 'sig', alg: 'ES256' };

    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ keys: [jwk] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterAll(() => {
    process.env.SUPABASE_URL = originalUrl;
    fetchSpy.mockRestore();
  });

  beforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    prisma = {
      profile: { findUnique: jest.fn() },
      // Default: no verified MFA factor, so existing tests below (none of
      // which care about MFA) don't need to know this query exists.
      $queryRaw: jest.fn().mockResolvedValue([{ has_verified_factor: false }]),
    };
    guard = new JwtGuard(prisma as unknown as PrismaService);
  });

  it('rejects a request with no Authorization header', async () => {
    await expect(guard.canActivate(contextWithHeader(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a malformed (non-Bearer) Authorization header', async () => {
    await expect(guard.canActivate(contextWithHeader('Token abc'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when SUPABASE_URL is not configured', async () => {
    delete process.env.SUPABASE_URL;
    const token = signToken(privateKey, 'user-1', 3600);
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with the wrong key', async () => {
    const otherKeyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const token = signToken(otherKeyPair.privateKey, 'user-1', 3600);
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const token = signToken(privateKey, 'user-1', -10);
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid token with no matching profile as ForbiddenException, same as a deleted account', async () => {
    // A missing profile means something removed the row out-of-band (e.g. a
    // direct DELETE against the database) rather than through the app's own
    // soft-delete flow -- it must be indistinguishable from that flow's
    // ForbiddenException so the frontend's handleErrorResponse() signs the
    // caller out here too, instead of leaving them stuck on an
    // unhandled 401.
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    const token = signToken(privateKey, 'user-1', 3600);
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('attaches { userId, role, email } to the request for a valid token + profile', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ role: 'admin', status: 'active' });
    const token = signToken(privateKey, 'user-1', 3600, 'ada@example.com');
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: `Bearer ${token}` },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ userId: 'user-1', role: 'admin', email: 'ada@example.com' });
    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true, status: true },
    });
  });

  it('attaches an undefined email when the token has no email claim', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ role: 'learner', status: 'active' });
    const token = signToken(privateKey, 'user-1', 3600);
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: `Bearer ${token}` },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ userId: 'user-1', role: 'learner', email: undefined });
  });

  it.each(['pending_deletion', 'suspended'] as const)(
    'rejects a valid token for a %s profile with ForbiddenException',
    async (status) => {
      prisma.profile.findUnique.mockResolvedValueOnce({ role: 'learner', status });
      const token = signToken(privateKey, 'user-1', 3600);
      await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    },
  );

  describe('AAL2 enforcement (2FA)', () => {
    it('allows an aal1 token when the account has no verified MFA factor', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ role: 'learner', status: 'active' });
      prisma.$queryRaw.mockResolvedValueOnce([{ has_verified_factor: false }]);
      const token = signToken(privateKey, 'user-1', 3600, undefined, 'aal1');
      await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).resolves.toBe(true);
    });

    it('rejects an aal1 token when the account has a verified MFA factor', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ role: 'learner', status: 'active' });
      prisma.$queryRaw.mockResolvedValueOnce([{ has_verified_factor: true }]);
      const token = signToken(privateKey, 'user-1', 3600, undefined, 'aal1');
      await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('allows an aal2 token when the account has a verified MFA factor', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ role: 'learner', status: 'active' });
      prisma.$queryRaw.mockResolvedValueOnce([{ has_verified_factor: true }]);
      const token = signToken(privateKey, 'user-1', 3600, undefined, 'aal2');
      await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).resolves.toBe(true);
    });

    it('fails open (allows access) when the auth.mfa_factors query itself errors', async () => {
      prisma.profile.findUnique.mockResolvedValueOnce({ role: 'learner', status: 'active' });
      prisma.$queryRaw.mockRejectedValueOnce(new Error('permission denied for table mfa_factors'));
      const token = signToken(privateKey, 'user-1', 3600, undefined, 'aal1');
      await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).resolves.toBe(true);
    });
  });
});
