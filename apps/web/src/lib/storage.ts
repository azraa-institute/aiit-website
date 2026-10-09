import { supabase } from './supabaseClient';

/**
 * Thin wrapper over Supabase Storage, used for both avatars and assignment
 * submissions. Callers upload to their own `{userId}/...` prefix -- RLS on
 * each bucket restricts writes to that prefix, same trust model as the DB.
 * Buckets must be created in the Supabase dashboard first; see the
 * infrastructure doc for the exact setup steps.
 */

export interface UploadConstraints {
  /** Rejected client-side with a readable message before ever reaching Supabase -- defense in depth alongside the bucket's own file_size_limit (see the storage_bucket_limits migration), not a substitute for it: a modified/scripted client skips this check entirely. */
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export async function uploadFile(bucket: string, path: string, file: File, constraints: UploadConstraints = {}): Promise<string> {
  if (!supabase) throw new Error('File storage is not configured yet.');
  const { maxSizeBytes, allowedMimeTypes } = constraints;
  if (maxSizeBytes && file.size > maxSizeBytes) {
    throw new Error(`That file is too large (max ${Math.floor(maxSizeBytes / (1024 * 1024))}MB).`);
  }
  if (allowedMimeTypes && !allowedMimeTypes.includes(file.type)) {
    throw new Error(`That file type isn't supported (allowed: ${allowedMimeTypes.map((t) => t.split('/')[1]).join(', ')}).`);
  }
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
