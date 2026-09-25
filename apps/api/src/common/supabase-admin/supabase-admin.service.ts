import { randomInt } from 'crypto';
import { ConflictException, Global, Injectable, Logger, Module, ServiceUnavailableException } from '@nestjs/common';

/** No look-alike characters (0/O, 1/l/I) -- the password gets read out or typed from a message. */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

const PASSWORD_SYMBOLS = '!@#$%&*?';

/** 14 characters: mixed case, a digit and a symbol, so it satisfies any Supabase password-strength setting. */
export function generateTemporaryPassword(length = 14): string {
  let out = '';
  for (let i = 0; i < length - 1; i += 1) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  if (!(/[a-z]/.test(out) && /[A-Z]/.test(out) && /\d/.test(out))) return generateTemporaryPassword(length);
  const at = randomInt(out.length + 1);
  return out.slice(0, at) + PASSWORD_SYMBOLS[randomInt(PASSWORD_SYMBOLS.length)] + out.slice(at);
}

/**
 * Thin wrapper over Supabase Auth's admin REST API (service-role key, server
 * only). Used by the admin portal to create staff logins, reset their
 * passwords, and ban/unban sessions on suspension.
 */
@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);

  isConfigured(): boolean {
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  }

  private request(path: string, init: RequestInit = {}): Promise<Response> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new ServiceUnavailableException(
        'Account management is not configured on this server (SUPABASE_SERVICE_ROLE_KEY is missing).',
      );
    }
    return fetch(new URL(`/auth/v1/admin${path}`, url), {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  }

  /** Creates a confirmed email+password user. Returns the new auth user id. */
  async createUser(email: string, password: string, name: string): Promise<string> {
    const res = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
    });
    if (res.ok) return ((await res.json()) as { id: string }).id;

    const body = await res.text().catch(() => '');
    if (/email_exists|already been registered|already exists/i.test(body)) {
      throw new ConflictException('An account with that email address already exists.');
    }
    this.logger.error(`Supabase createUser failed (${res.status}): ${body.slice(0, 300)}`);
    throw new ServiceUnavailableException('Could not create the login right now -- try again shortly.');
  }

  async setPassword(userId: string, password: string): Promise<void> {
    await this.update(userId, { password });
  }

  /** Blocks all sign-ins and token refreshes for the account until unbanned. */
  async ban(userId: string): Promise<void> {
    await this.update(userId, { ban_duration: '876000h' });
  }

  async unban(userId: string): Promise<void> {
    await this.update(userId, { ban_duration: 'none' });
  }

  /** Best-effort ban/unban for suspension -- the API's own status check (JwtGuard) blocks the account regardless, so a Supabase hiccup shouldn't fail the admin's action. */
  async tryBan(userId: string, banned: boolean): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(`SUPABASE_SERVICE_ROLE_KEY not set -- ${userId} suspension enforced by the API only.`);
      return;
    }
    try {
      await (banned ? this.ban(userId) : this.unban(userId));
    } catch (error) {
      this.logger.error(`Could not ${banned ? 'ban' : 'unban'} ${userId}`, error instanceof Error ? error.stack : String(error));
    }
  }

  private async update(userId: string, body: Record<string, unknown>): Promise<void> {
    const res = await this.request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Supabase update ${userId} failed (${res.status}): ${text.slice(0, 300)}`);
      throw new ServiceUnavailableException('Could not update the login right now -- try again shortly.');
    }
  }
}

@Global()
@Module({ providers: [SupabaseAdminService], exports: [SupabaseAdminService] })
export class SupabaseAdminModule {}
