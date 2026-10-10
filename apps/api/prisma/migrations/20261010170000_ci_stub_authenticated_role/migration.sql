-- CI stub, same reasoning as 20260910235959_stub_auth_schema and
-- 20261009235959_stub_storage_schema: the next migration
-- (20261010180000_storage_write_policies) grants its policies
-- `TO authenticated`, a role that exists by default on every real
-- Supabase project but not on CI's bare Postgres container, which made
-- CI fail with "role \"authenticated\" does not exist" (Database error
-- code 42704) on every run since that migration landed. Guarded by an
-- existence check rather than CREATE ROLE IF NOT EXISTS (Postgres has no
-- such clause for roles) -- a genuine no-op against real Supabase, where
-- the role already exists; this never touches or recreates it there.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END $$;
