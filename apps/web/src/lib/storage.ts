import { supabase } from './supabaseClient';

/**
 * Public-bucket read helper for Supabase Storage. Avatar/assignment uploads
 * themselves go through the API instead (see apps/api's SupabaseAdminService
 * and ProfileController/AssignmentSubmissionsController) -- direct
 * browser-to-Storage writes are broken for this project (Supabase Storage
 * fails to bridge the request JWT into the RLS evaluation context). A
 * public-bucket read like this one is unaffected (no RLS write involved),
 * so it's still fine to do directly from the client.
 */
export function publicFileUrl(bucket: string, key: string | null | undefined): string | null {
  if (!supabase || !key) return null;
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}
