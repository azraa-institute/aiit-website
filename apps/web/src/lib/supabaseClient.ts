import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * null until VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are configured (e.g.
 * a preview deploy before Supabase project keys are wired in). Callers must
 * treat that as "no session available" rather than crash the app.
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
