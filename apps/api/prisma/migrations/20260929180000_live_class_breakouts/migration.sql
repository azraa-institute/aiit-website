-- Breakout rooms: which rooms exist and who's assigned to which, for the
-- current live class. Each breakout room is a genuinely separate LiveKit
-- room ("<room_name>-bo-<id>"), created implicitly on first join rather
-- than tracked here -- this column only holds the assignment bookkeeping,
-- same one-current-value JSON pattern as whiteboard_state/active_poll.

ALTER TABLE "live_classes" ADD COLUMN "breakout_state" JSONB;
