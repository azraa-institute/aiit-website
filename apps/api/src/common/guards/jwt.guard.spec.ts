import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
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

function signToken(privateKey: KeyObject, subject: string, expiresInSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: KID, typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
  );
  const signature = cryptoSign('sha256', Buffer.from(`${header}.${payload}`), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${payload}.${base64url(signature)}`;
}

describe('JwtGuard', () => {
  const originalUrl = process.env.SUPABASE_URL;
  let prisma: { profile: { findUnique: jest.Mock } };
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
    prisma = { profile: { findUnique: jest.fn() } };
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

  it('rejects a valid token with no matching profile', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    const token = signToken(privateKey, 'user-1', 3600);
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches { userId, role } to the request for a valid token + profile', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ role: 'admin' });
    const token = signToken(privateKey, 'user-1', 3600);
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: `Bearer ${token}` },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ userId: 'user-1', role: 'admin' });
    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true },
    });
  });
});
