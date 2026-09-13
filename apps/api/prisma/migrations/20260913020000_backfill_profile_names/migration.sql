-- Isolated on purpose (see 20260912000001_auth_trigger for why): touching
-- auth.users needs privileges the pooler connection role may not have. If
-- this migration fails in production for that reason, the fallback is the
-- same as that one -- run these statements by hand via Supabase Dashboard
-- -> SQL Editor, then
-- `prisma migrate resolve --applied 20260913020000_backfill_profile_names`.
--
-- Root cause this fixes: neither signup path ever wrote a name into
-- profiles. Google OAuth puts the account's real name in
-- auth.users.raw_user_meta_data (full_name/name); RegisterPage's
-- email/password signup already collects first/last name into that same
-- metadata column (see supabase.auth.signUp's `data` option) -- but
-- handle_new_user() only ever inserted (id, role), so every account's name
-- stayed null regardless of signup method, and the portal fell back to a
-- generic "A" avatar mark for everyone until they visited Profile and
-- typed a name in by hand.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta_name text;
BEGIN
  meta_name := NULLIF(TRIM(BOTH ' ' FROM COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name'))
  )), '');

  INSERT INTO public.profiles (id, role, name) VALUES (NEW.id, 'learner', meta_name) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- One-time backfill for accounts created before this fix. `WHERE p.name IS
-- NULL` makes this safe to re-run and guarantees it never overwrites a
-- name someone has since typed in themselves on the Profile page.
UPDATE public.profiles p
SET name = NULLIF(TRIM(BOTH ' ' FROM COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  TRIM(CONCAT_WS(' ', u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name'))
)), '')
FROM auth.users u
WHERE p.id = u.id AND p.name IS NULL;
