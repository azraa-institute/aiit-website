-- Gives the project owner's own test account the 'instructor' role so the
-- live-classroom instructor flow can be exercised before real instructors
-- exist. Only promotes a plain learner (never demotes an admin), and does
-- nothing if the account hasn't signed up yet. Wrapped so a permissions
-- problem reading auth.users can never fail the whole deploy -- if that
-- happens, run the UPDATE by hand in the Supabase SQL editor instead.
DO $$
BEGIN
  UPDATE public.profiles
     SET role = 'instructor'
   WHERE role = 'learner'
     AND id IN (SELECT id FROM auth.users WHERE lower(email) = 'ndubuisigodcares1011@gmail.com');
EXCEPTION WHEN insufficient_privilege OR undefined_column THEN
  -- undefined_column: CI's stub auth.users has no email column (real Supabase does).
  RAISE NOTICE 'Could not read auth.users.email -- promote the test instructor manually.';
END
$$;
