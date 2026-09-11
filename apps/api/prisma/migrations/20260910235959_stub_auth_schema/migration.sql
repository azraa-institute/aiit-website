-- Stub only, for the shadow database and any ephemeral/CI database that
-- doesn't already have Supabase's real auth schema. IF NOT EXISTS makes
-- this a genuine no-op against real Supabase, where auth.users already
-- exists with its real columns — this never touches or recreates it there.
-- (The real Supabase database still needs a one-time manual baseline
-- before its first `prisma migrate deploy`, documented in deploy.yml,
-- since P3005's "schema is not empty" check happens before any migration
-- SQL runs at all — this stub doesn't change that.)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);
