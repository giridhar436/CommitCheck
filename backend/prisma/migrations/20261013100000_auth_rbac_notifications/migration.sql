-- Phase 15: production hardening — auth/RBAC membership + notification audit.
-- Additive only: new enum types, new tables, nullable column, new enum values.
-- No existing column is dropped, retyped, or made stricter; no data is rewritten.

-- Project-level roles (OWNER > ADMIN > MEMBER > VIEWER)
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- Delivery state for notification attempts
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- Ownership pointer to the Supabase Auth user (no FK: identity lives in the
-- auth schema). Nullable for legacy rows; new projects always set it.
ALTER TABLE "projects" ADD COLUMN "owner_user_id" UUID;
CREATE INDEX "projects_owner_user_id_idx" ON "projects"("owner_user_id");

CREATE TABLE "project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One row per notification event. The unique event key makes sends
-- idempotent; failures are recorded with a sanitized error message.
CREATE TABLE "notification_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_key" VARCHAR(191) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "project_id" UUID NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "recipient_user_id" UUID,
    "recipient_email" VARCHAR(320),
    "provider" VARCHAR(50) NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_log_event_key_key" ON "notification_log"("event_key");
CREATE INDEX "notification_log_project_id_created_at_idx" ON "notification_log"("project_id", "created_at" DESC);

ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit trail for membership changes (written by the members API)
ALTER TYPE "ActivityAction" ADD VALUE 'MEMBER_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'MEMBER_ROLE_CHANGED';
ALTER TYPE "ActivityAction" ADD VALUE 'MEMBER_REMOVED';
