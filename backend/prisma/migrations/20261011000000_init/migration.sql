-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('AUTHORIZED', 'UNAUTHORIZED', 'PENDING');

-- CreateEnum
CREATE TYPE "MeetingAnalysisStatus" AS ENUM ('NOT_STARTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SOW', 'CONTRACT', 'PROPOSAL', 'REQUIREMENTS', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('TRANSCRIPT', 'SUMMARY', 'NOTES', 'RECORDING', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('PROJECT_CREATED', 'SCOPE_UPDATED', 'DOCUMENT_UPLOADED', 'MEETING_CREATED', 'MEETING_ANALYZED', 'COMMITMENT_DETECTED', 'COMMITMENT_FLAGGED', 'CHANGE_REQUEST_CREATED', 'CHANGE_REQUEST_APPROVED', 'CHANGE_REQUEST_REJECTED', 'CHANGE_REQUEST_CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('PROJECT', 'SCOPE_REQUIREMENT', 'MEETING', 'MEETING_ATTACHMENT', 'COMMITMENT', 'CHANGE_REQUEST', 'DOCUMENT');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "budget" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scope_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "source_clause" TEXT,
    "acceptance_criteria" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scope_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "analysis_status" "MeetingAnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "meeting_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT,
    "storage_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "speaker" TEXT,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "authorization_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "confidence_score" DOUBLE PRECISION,
    "evidence_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitment_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commitment_id" UUID NOT NULL,
    "quote" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3),
    "source" "EvidenceSource" NOT NULL DEFAULT 'TRANSCRIPT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitment_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "commitment_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approval_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "entity_type" "ActivityEntityType" NOT NULL,
    "entity_id" UUID,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "scope_requirements_project_id_approval_status_idx" ON "scope_requirements"("project_id", "approval_status");

-- CreateIndex
CREATE INDEX "scope_requirements_project_id_priority_idx" ON "scope_requirements"("project_id", "priority");

-- CreateIndex
CREATE INDEX "meetings_project_id_meeting_date_idx" ON "meetings"("project_id", "meeting_date" DESC);

-- CreateIndex
CREATE INDEX "meetings_project_id_analysis_status_idx" ON "meetings"("project_id", "analysis_status");

-- CreateIndex
CREATE INDEX "meeting_attachments_meeting_id_idx" ON "meeting_attachments"("meeting_id");

-- CreateIndex
CREATE INDEX "commitments_project_id_authorization_status_idx" ON "commitments"("project_id", "authorization_status");

-- CreateIndex
CREATE INDEX "commitments_project_id_risk_level_idx" ON "commitments"("project_id", "risk_level");

-- CreateIndex
CREATE INDEX "commitments_meeting_id_authorization_status_idx" ON "commitments"("meeting_id", "authorization_status");

-- CreateIndex
CREATE INDEX "commitment_evidence_commitment_id_idx" ON "commitment_evidence"("commitment_id");

-- CreateIndex
CREATE INDEX "change_requests_project_id_status_idx" ON "change_requests"("project_id", "status");

-- CreateIndex
CREATE INDEX "change_requests_commitment_id_idx" ON "change_requests"("commitment_id");

-- CreateIndex
CREATE INDEX "documents_project_id_type_idx" ON "documents"("project_id", "type");

-- CreateIndex
CREATE INDEX "activities_project_id_created_at_idx" ON "activities"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activities_action_idx" ON "activities"("action");

-- AddForeignKey
ALTER TABLE "scope_requirements" ADD CONSTRAINT "scope_requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attachments" ADD CONSTRAINT "meeting_attachments_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitment_evidence" ADD CONSTRAINT "commitment_evidence_commitment_id_fkey" FOREIGN KEY ("commitment_id") REFERENCES "commitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_commitment_id_fkey" FOREIGN KEY ("commitment_id") REFERENCES "commitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

