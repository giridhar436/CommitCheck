-- Phase 7 (Commitment Evidence API): audit actions for evidence add/delete.
-- Purely additive enum values — no table or column changes.

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'EVIDENCE_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'EVIDENCE_DELETED';
