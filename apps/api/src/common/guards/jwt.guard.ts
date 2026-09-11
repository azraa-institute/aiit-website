import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Phase 0 stub — not wired to any route yet. Phase 1 replaces this with a
 * real Supabase JWT verification (Authorization: Bearer <token>).
 */
@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
