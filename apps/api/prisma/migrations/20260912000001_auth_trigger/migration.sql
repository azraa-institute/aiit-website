-- Isolated on purpose (see deploy.yml for why): creating a trigger ON
-- auth.users needs elevated privileges the pooler connection role likely
-- doesn't have -- Phase 0 already proved that role gets "permission denied
-- for schema auth" on CREATE SCHEMA/CREATE TABLE there. If this migration
-- fails in production for the same reason, the fallback (owner runs these
-- two statements by hand via Supabase Dashboard -> SQL Editor, then
-- `prisma migrate resolve --applied 20260912000001_auth_trigger`) is
-- documented as a step in deploy.yml, mirroring the Phase 0 baseline
-- pattern. Keeping this in its own file means that fallback only ever
-- needs to touch this one migration, not the whole profiles change.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (NEW.id, 'learner') ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
