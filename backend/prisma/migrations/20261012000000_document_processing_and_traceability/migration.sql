-- Phase 13 (Scope & Document Intelligence): additive only —
-- 1. a processing lifecycle for documents (status + outcome markers),
-- 2. a 1:1 home for deterministically extracted document text,
-- 3. an optional traceability link from a scope requirement to its
--    source document (SET NULL when the document is deleted),
-- 4. audit actions for document metadata updates/deletion and the two
--    processing outcomes. DOCUMENT_UPLOADED already exists and is reused
--    for creation. No existing column or row is touched.

CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_DELETED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_PROCESSED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_PROCESSING_FAILED';

ALTER TABLE "documents" ADD COLUMN "processing_status" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "processed_at" TIMESTAMP(3),
    ADD COLUMN "processing_error" TEXT;

-- CreateTable
CREATE TABLE "document_texts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "char_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_texts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "scope_requirements" ADD COLUMN "source_document_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "document_texts_document_id_key" ON "document_texts"("document_id");

-- CreateIndex
CREATE INDEX "scope_requirements_source_document_id_idx" ON "scope_requirements"("source_document_id");

-- AddForeignKey
ALTER TABLE "document_texts" ADD CONSTRAINT "document_texts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scope_requirements" ADD CONSTRAINT "scope_requirements_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
