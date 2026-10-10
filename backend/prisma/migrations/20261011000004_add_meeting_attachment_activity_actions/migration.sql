-- Phase 5 (Meeting Attachments API): audit actions for attachment
-- metadata create/update/delete. Purely additive enum values —
-- no table or column changes.

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'MEETING_ATTACHMENT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'MEETING_ATTACHMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'MEETING_ATTACHMENT_DELETED';
