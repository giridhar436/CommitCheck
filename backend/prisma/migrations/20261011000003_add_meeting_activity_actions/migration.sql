-- Phase 4 (Meetings API): audit actions for meeting update/delete.
-- Purely additive enum values — no table or column changes.
-- (MEETING_CREATED and MEETING_ANALYZED already exist from Phase 1.)

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'MEETING_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'MEETING_DELETED';
