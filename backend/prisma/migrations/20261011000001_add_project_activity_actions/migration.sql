-- Phase 2 (Projects API): audit actions for project update/delete.
-- Purely additive enum values — no data or table changes.

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'PROJECT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'PROJECT_DELETED';
