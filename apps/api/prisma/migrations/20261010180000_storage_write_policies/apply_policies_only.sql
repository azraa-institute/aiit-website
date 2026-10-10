-- TEMP, workflow-run-once helper -- not part of the tracked migration
-- itself (migration.sql also has the CI-only storage.objects stub ahead
-- of these statements, which would fail against production with the same
-- schema-level permission error the stub exists to work around in CI;
-- these four statements run alone, against the real already-existing
-- table). Deleted once applied.
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
