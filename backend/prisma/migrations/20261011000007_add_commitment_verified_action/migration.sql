-- Phase 10 (Scope Verification): dedicated audit action for scope-verification
-- runs. Purely additive enum value — no table or column changes.

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'COMMITMENT_VERIFIED';
