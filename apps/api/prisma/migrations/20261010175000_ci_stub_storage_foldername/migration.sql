-- CI stub, same reasoning as 20261010170000_ci_stub_authenticated_role,
-- for the next migration (20261010180000_storage_write_policies), which
-- also calls storage.foldername() -- another real-Supabase-provided
-- function that CI's bare Postgres container doesn't have ("function
-- storage.foldername(text) does not exist", error 42883).
--
-- Guarded by an existence check against pg_proc, not CREATE OR REPLACE --
-- CREATE OR REPLACE would silently overwrite the real Supabase function
-- in production with this simplified stand-in, which is exactly what must
-- never happen. A plain CREATE FUNCTION can't be conditional on its own,
-- so the whole statement is built as a dynamic string and only executed
-- when nothing by this name already exists -- a genuine no-op against
-- real Supabase, where storage.foldername already exists.
--
-- The real function splits the path and drops the last (filename)
-- segment; this stub only needs to support the one thing
-- storage_write_policies' policies do with it --
-- (storage.foldername(name))[1], the leading {userId} path segment --
-- so returning the full split is equivalent for index [1] and simpler.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'storage' AND p.proname = 'foldername'
    ) THEN
        EXECUTE $def$
            CREATE FUNCTION storage.foldername(name text)
            RETURNS text[]
            LANGUAGE sql
            IMMUTABLE
            AS $f$ SELECT string_to_array(name, '/') $f$;
        $def$;
    END IF;
END $$;
