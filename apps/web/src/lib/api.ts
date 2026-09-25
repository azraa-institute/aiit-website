import type { ApiErrorEnvelope } from '@aiit/shared';
import { supabase } from './supabaseClient';

/** Exported for the rare case a plain (non-fetch) link needs the API origin directly -- e.g. a public PDF download that needs no auth header, so a real <a href> works and apiFetch's blob-handling isn't needed. */
export const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/v1`;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * A profile is soft-deleted (JwtGuard checks status, see the API), not
 * erased -- its Supabase session can still exist and still authenticate,
 * so nothing stops a signed-in tab from continuing to call the API after
 * the account is deleted elsewhere (another tab, another device) until it
 * hits a guarded endpoint again. Matched by message text rather than the
 * generic 403 status, since RolesGuard also throws 403 for an ordinary
 * permission error that should just show inline, not sign the user out.
 */
export const ACCOUNT_DELETED_MESSAGE = 'This account has been deleted.';

/** Sent by the API's JwtGuard for an admin-suspended account -- keep in sync with apps/api/src/common/guards/jwt.guard.ts. */
export const ACCOUNT_SUSPENDED_MESSAGE = 'This account has been suspended.';

async function handleErrorResponse(res: Response): Promise<never> {
  const body: ApiErrorEnvelope | null = await res.json().catch(() => null);
  const message = body?.error.message ?? `Request failed with status ${res.status}.`;

  if (res.status === 403 && message === ACCOUNT_DELETED_MESSAGE) {
    if (supabase) await supabase.auth.signOut().catch(() => {});
    window.location.href = '/login?reason=deleted';
    // Navigation above is async and won't interrupt this function -- throw
    // anyway so any caller still awaiting this call doesn't hang.
  }

  if (res.status === 403 && message === ACCOUNT_SUSPENDED_MESSAGE) {
    if (supabase) await supabase.auth.signOut().catch(() => {});
    // Staff and students sign in on different pages -- send them back to their own.
    const staff = /^\/(admin|instructor|staff)(\/|$)/.test(window.location.pathname);
    window.location.href = `${staff ? '/staff/login' : '/login'}?reason=suspended`;
  }

  throw new ApiError(message, body?.error.code ?? 'UNKNOWN', res.status);
}

async function authHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  return headers;
}

/** Thin fetch wrapper for the AIIT API -- attaches the Supabase session (if any) and parses AllExceptionsFilter's error envelope. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders(init.headers);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) await handleErrorResponse(res);

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Confirms the just-authenticated account's profile is still real and
 * active before a sign-in flow navigates into /portal. Supabase's own
 * session is silent on this -- a profile row deleted directly in the
 * database (bypassing the app's own soft-delete flow) still issues a
 * perfectly valid session, so without this check every sign-in path would
 * land the caller in /portal, have its first data fetch rejected there,
 * and immediately bounce back out: a jarring flash of portal chrome
 * before landing back on /login. Resolves false only for that exact
 * case -- handleErrorResponse above has already signed the caller out and
 * kicked off the redirect to /login?reason=deleted by the time this
 * returns, so callers just need to not also navigate into /portal on top
 * of it. Any other failure (network blip, etc.) isn't this check's job to
 * handle -- resolves true and lets /portal's own error state cover it, same
 * as before this existed.
 */
export async function canEnterPortal(): Promise<boolean> {
  try {
    await apiFetch('/auth/me');
    return true;
  } catch (err) {
    return !(
      err instanceof ApiError &&
      err.status === 403 &&
      (err.message === ACCOUNT_DELETED_MESSAGE || err.message === ACCOUNT_SUSPENDED_MESSAGE)
    );
  }
}

/** Same auth handling as apiFetch, but for binary responses (a certificate PDF) rather than JSON -- apiFetch always calls res.json(), which would fail on a PDF body. */
export async function apiFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const headers = await authHeaders(init.headers);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) await handleErrorResponse(res);

  return res.blob();
}

/** Saves a Blob (e.g. from apiFetchBlob) as a file -- the only way to trigger a real download for an authenticated request, since a plain <a href> can't carry the Authorization header. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
