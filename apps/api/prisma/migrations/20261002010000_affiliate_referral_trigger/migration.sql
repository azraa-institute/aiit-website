-- Isolated on purpose (see 20260912000001_auth_trigger for why): touching
-- auth.users needs privileges the pooler connection role may not have. If
-- this migration fails in production for that reason, the fallback is the
-- same as that one -- run these statements by hand via Supabase Dashboard
-- -> SQL Editor, then
-- `prisma migrate resolve --applied 20261002010000_affiliate_referral_trigger`.
--
-- Extends handle_new_user() (full re-declaration, Postgres has no partial
-- function edit) to also read a pending referral slug out of the new
-- account's signup metadata (RegisterPage.tsx passes it as `referral_slug`
-- in supabase.auth.signUp()'s `data` option, the same mechanism
-- first_name/last_name already use) and, if it matches a real affiliate's
-- link, attribute the new profile to that affiliate at insert time.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta_name text;
  ref_slug text;
  ref_affiliate_id uuid;
BEGIN
  meta_name := NULLIF(TRIM(BOTH ' ' FROM COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name'))
  )), '');

  ref_slug := NEW.raw_user_meta_data->>'referral_slug';
  IF ref_slug IS NOT NULL THEN
    SELECT id INTO ref_affiliate_id FROM public.affiliates WHERE referral_slug = ref_slug;
  END IF;

  INSERT INTO public.profiles (id, role, name, referred_by_affiliate_id)
  VALUES (NEW.id, 'learner', meta_name, ref_affiliate_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
