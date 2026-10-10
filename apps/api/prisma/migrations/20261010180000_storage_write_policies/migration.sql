-- Fixes a real bug reported live: uploading a profile photo failed with
-- "new row violates row-level security policy" (confirmed from the
-- browser's own error message, surfaced via apps/web's uploadFile() ->
-- Supabase Storage client SDK). The avatars/submissions buckets exist and
-- read correctly (confirmed separately: an overly-permissive public LIST
-- policy already lets clients list bucket contents), but neither bucket
-- ever had an INSERT/UPDATE/DELETE policy letting an authenticated user
-- write into their own `{userId}/...` path prefix -- the same prefix
-- apps/web/src/lib/storage.ts's uploadFile()/removeFile() already assume
-- (ProfilePage.tsx: `${session.user.id}/avatar-${Date.now()}.${ext}`,
-- AssignmentRow.tsx: `${session.user.id}/${assignment.id}/${file.name}`).
-- Supabase's own storage.foldername() helper splits an object's path on
-- '/' and returns it as an array, so (storage.foldername(name))[1] is
-- always that leading {userId} segment regardless of how many more
-- segments follow it.
--
-- Same privilege class as every other storage.*/auth.* migration in this
-- history (see 20261009235959_stub_storage_schema and deploy.yml's own
-- running commentary) -- storage.objects is Supabase-owned, so the pooler
-- connection role this migration runs under almost certainly can't CREATE
-- POLICY on it. If `prisma migrate deploy` fails on this migration in
-- production: run the four CREATE POLICY statements below by hand via
-- Supabase Dashboard -> SQL Editor (the exact same four statements, no
-- edits needed), then
--   npx prisma migrate resolve --applied 20261010180000_storage_write_policies --schema apps/api/prisma/schema.prisma
-- (through the Deploy workflow's existing one-time-step pattern, reusing
-- secrets.DATABASE_URL -- never typed into a local terminal -- same as
-- every prior case).
--
-- CI stub: storage.objects doesn't exist at all in CI's bare Postgres
-- container (only storage.buckets was stubbed, by the migration above,
-- and only with the columns that migration's own UPDATE touches). IF NOT
-- EXISTS makes this a genuine no-op against real Supabase, where
-- storage.objects already exists with its real (much larger) column set
-- and real rows -- this never touches or recreates it there.
CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID NOT NULL,
    bucket_id TEXT,
    name TEXT,
    owner UUID,
    CONSTRAINT objects_pkey PRIMARY KEY (id)
);

CREATE POLICY "avatars_write_own_folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own_folder" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own_folder" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "submissions_write_own_folder" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
