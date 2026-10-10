-- TEMP, workflow-run-once helper -- not part of the tracked migration
-- itself (migration.sql also has the CI-only storage.objects stub ahead
-- of these statements, which would fail against production with the same
-- schema-level permission error the stub exists to work around in CI;
-- these four statements run alone, against the real already-existing
-- table). Deleted once applied.
--
-- DROP POLICY IF EXISTS before each CREATE: the first run of this file hit
-- "policy already exists" on the very first statement (the pooler role can
-- create storage policies fine -- this isn't the schema-level restriction
-- cases 4/5 hit -- something had already created at least this one by the
-- time this ran), and a sequential script stops at its first error, so the
-- other three's state was unknown. Idempotent regardless of which of the
-- four, if any, already existed.
DROP POLICY IF EXISTS "avatars_write_own_folder" ON storage.objects;
CREATE POLICY "avatars_write_own_folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own_folder" ON storage.objects;
CREATE POLICY "avatars_update_own_folder" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own_folder" ON storage.objects;
CREATE POLICY "avatars_delete_own_folder" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "submissions_write_own_folder" ON storage.objects;
CREATE POLICY "submissions_write_own_folder" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
