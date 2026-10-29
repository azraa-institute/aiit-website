-- Social profiles + follower counts on an affiliate application, so an
-- admin has something real to screen "serious" applicants on. A JSON
-- array (platform/url/followersReported/followersFetched/fetchStatus/
-- fetchedAt per entry), not a relational table -- see the schema comment
-- on Affiliate.socialLinks.

ALTER TABLE "affiliates" ADD COLUMN "social_links" JSONB;
