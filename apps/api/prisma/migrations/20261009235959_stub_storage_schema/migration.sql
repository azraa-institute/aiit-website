-- Stub only, same reasoning and pattern as 20260910235959_stub_auth_schema
-- -- for the shadow database and any ephemeral/CI database that doesn't
-- already have Supabase's real storage schema. IF NOT EXISTS makes this a
-- genuine no-op against real Supabase, where storage.buckets already
-- exists with its real columns (and real rows) -- this never touches or
-- recreates it there. Only the columns 20261010000000_storage_bucket_limits
-- actually writes are stubbed; CI's UPDATE against this empty table is a
-- harmless no-op (no rows exist to match), which is all that migration
-- needs to succeed outside real Supabase.
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT NOT NULL,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[],
    CONSTRAINT buckets_pkey PRIMARY KEY (id)
);
