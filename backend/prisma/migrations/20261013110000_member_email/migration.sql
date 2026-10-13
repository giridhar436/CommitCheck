-- Phase 15: member email cache. Resolved from Supabase Auth (Admin API) when
-- a member is added to a project, so notification providers can address
-- members without querying the auth schema at send time. Additive, nullable.

ALTER TABLE "project_members" ADD COLUMN "email" VARCHAR(320);
