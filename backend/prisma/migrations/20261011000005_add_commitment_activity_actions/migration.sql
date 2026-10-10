-- Phase 6 (Commitments API): audit actions for commitment create/update/delete.
-- Purely additive enum values — no table or column changes.

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMITMENT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMITMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMITMENT_DELETED';
