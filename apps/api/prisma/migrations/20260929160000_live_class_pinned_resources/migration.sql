-- Links/notes the host pins during a live class (a slide deck, a repo, a
-- reading) so they stay visible in the classroom and survive into the
-- course workspace for post-class review, same pattern as whiteboard_state.

ALTER TABLE "live_classes" ADD COLUMN "pinned_resources" JSONB;
