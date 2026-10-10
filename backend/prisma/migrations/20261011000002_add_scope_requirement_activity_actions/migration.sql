-- Phase 3 (Scope Requirements API): audit actions for requirement create/update/delete.
-- Purely additive enum values — no table or column changes.

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SCOPE_REQUIREMENT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SCOPE_REQUIREMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'SCOPE_REQUIREMENT_DELETED';
