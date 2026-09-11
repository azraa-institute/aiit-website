import type { ApiErrorEnvelope } from '@aiit/shared';
import { supabase } from './supabaseClient';

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/v1`;

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
