-- Phase 11 (Change Request workflow): two purely additive changes —
-- 1. new lifecycle state for the clarification flow,
-- 2. a home for the clarification comment (no generic comments table).
-- No existing column or row is touched.

ALTER TYPE "ChangeRequestStatus" ADD VALUE IF NOT EXISTS 'CLARIFICATION_REQUESTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'CHANGE_REQUEST_CLARIFICATION_REQUESTED';

ALTER TABLE "change_requests" ADD COLUMN "clarification_comment" TEXT;
