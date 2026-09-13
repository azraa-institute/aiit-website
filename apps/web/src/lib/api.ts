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

/** Thin fetch wrapper for the AIIT API -- attaches the Supabase session (if any) and parses AllExceptionsFilter's error envelope. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body: ApiErrorEnvelope | null = await res.json().catch(() => null);
    throw new ApiError(
      body?.error.message ?? `Request failed with status ${res.status}.`,
      body?.error.code ?? 'UNKNOWN',
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Same auth handling as apiFetch, but for binary responses (a certificate PDF) rather than JSON -- apiFetch always calls res.json(), which would fail on a PDF body. */
export async function apiFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(init.headers);

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body: ApiErrorEnvelope | null = await res.json().catch(() => null);
    throw new ApiError(
      body?.error.message ?? `Request failed with status ${res.status}.`,
      body?.error.code ?? 'UNKNOWN',
      res.status,
    );
  }

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
