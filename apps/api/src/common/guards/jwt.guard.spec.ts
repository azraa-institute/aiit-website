import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { JwtGuard } from './jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

const SECRET = 'test-secret';

function contextWithHeader(authorization?: string): ExecutionContext {
  const request = { headers: { authorization } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtGuard', () => {
  const originalSecret = process.env.SUPABASE_JWT_SECRET;
  let prisma: { profile: { findUnique: jest.Mock } };
  let guard: JwtGuard;

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    prisma = { profile: { findUnique: jest.fn() } };
    guard = new JwtGuard(prisma as unknown as PrismaService);
  });

  afterAll(() => {
    process.env.SUPABASE_JWT_SECRET = originalSecret;
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

  it('rejects a token signed with the wrong secret', async () => {
    const token = sign({ sub: 'user-1' }, 'wrong-secret', { algorithm: 'HS256', expiresIn: '1h' });
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const token = sign({ sub: 'user-1' }, SECRET, { algorithm: 'HS256', expiresIn: -10 });
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid token with no matching profile', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce(null);
    const token = sign({ sub: 'user-1' }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    await expect(guard.canActivate(contextWithHeader(`Bearer ${token}`))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches { userId, role } to the request for a valid token + profile', async () => {
    prisma.profile.findUnique.mockResolvedValueOnce({ role: 'admin' });
    const token = sign({ sub: 'user-1' }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
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
