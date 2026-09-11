import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from './jwt.guard';

function contextWithUser(user: AuthenticatedUser | undefined): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request through when no @Roles() metadata is set', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });

  it('rejects when there is no authenticated user at all', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin']) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });

  it("rejects when the user's role isn't in the required list", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin']) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextWithUser({ userId: 'u1', role: 'learner' }))).toThrow(
      ForbiddenException,
    );
  });

  it("allows when the user's role is in the required list", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin', 'instructor']) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(contextWithUser({ userId: 'u1', role: 'instructor' }))).toBe(true);
  });
});
