import { supabase } from './supabaseClient';

/**
 * Thin wrapper over Supabase Storage, used for both avatars and assignment
 * submissions. Callers upload to their own `{userId}/...` prefix -- RLS on
 * each bucket restricts writes to that prefix, same trust model as the DB.
 * Buckets must be created in the Supabase dashboard first; see the
 * infrastructure doc for the exact setup steps.
 */

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  if (!supabase) throw new Error('File storage is not configured yet.');
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export function publicFileUrl(bucket: string, key: string | null | undefined): string | null {
  if (!supabase || !key) return null;
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

export async function removeFile(bucket: string, key: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.storage.from(bucket).remove([key]);
  if (error) throw error;
}
