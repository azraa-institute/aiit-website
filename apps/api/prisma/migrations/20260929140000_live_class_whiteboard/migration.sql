-- Whiteboard: last-saved board state (strokes + optional background
-- snapshot) for a live class, so late joiners and post-class review don't
-- depend on a peer still being in the room. RLS is unchanged -- it's a new
-- column on an already-policied table, not a new table.

ALTER TABLE "live_classes" ADD COLUMN "whiteboard_state" JSONB;
