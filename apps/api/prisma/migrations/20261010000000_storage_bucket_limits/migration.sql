-- Isolated on purpose (see 20260912000001_auth_trigger for why): writing to
-- storage.buckets, like auth.users, is outside the public schema and may
-- need privileges the pooler connection role doesn't have. If this
-- migration fails in production for that reason, the fallback is the same
-- as that one -- run these statements by hand via Supabase Dashboard ->
-- SQL Editor, then
-- `prisma migrate resolve --applied 20261010000000_storage_bucket_limits`.
--
-- This is the real enforcement behind apps/web/src/lib/storage.ts's
-- client-side maxSizeBytes/allowedMimeTypes checks -- those only reject a
-- bad upload in the normal browser UI; a modified or scripted client can
-- skip straight past them and call the Supabase Storage API directly.
-- file_size_limit/allowed_mime_types are enforced by Supabase's own
-- storage server on every upload, authenticated client or not, so they're
-- the actual security boundary. Limits mirror the web app's own constants
-- (ProfilePage.tsx's AVATAR_UPLOAD_CONSTRAINTS, AssignmentRow.tsx's
-- SUBMISSION_UPLOAD_CONSTRAINTS) -- keep them in sync if either changes.

UPDATE storage.buckets
SET file_size_limit = 2097152, -- 2 MiB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

UPDATE storage.buckets
SET file_size_limit = 26214400 -- 25 MiB, no MIME restriction (a submission can legitimately be any document type)
WHERE id = 'submissions';
