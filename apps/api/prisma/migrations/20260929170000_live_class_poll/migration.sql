-- A quick-check poll (question, options, raw votes keyed by user id) the
-- host can run during class. Stored whole and replaced by the next poll --
-- no history table, same "one current value, JSON" pattern as
-- whiteboard_state and pinned_resources.

ALTER TABLE "live_classes" ADD COLUMN "active_poll" JSONB;
