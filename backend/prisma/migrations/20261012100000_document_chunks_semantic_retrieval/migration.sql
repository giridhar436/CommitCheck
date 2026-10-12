-- Phase 14 — Document Intelligence & Semantic Scope Retrieval.
-- Additive only: creates the DocumentChunk derived-data table and its
-- indexes. No existing column/table/enum is altered or removed, so all
-- Phase 1-13 rows survive untouched.
--
-- pgvector is intentionally NOT enabled here: the vector extension is not
-- available in the ephemeral test Postgres (probed via pg_available_extensions)
-- and no embedding provider is configured by default. Embeddings, when a
-- provider is configured, are stored as plain JSON float arrays and compared
-- in-process (brute force). See README "Documents API - Phase 14".

CREATE TYPE "ChunkEmbeddingStatus" AS ENUM ('SKIPPED', 'PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "char_start" INTEGER NOT NULL,
    "char_end" INTEGER NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "embedding_status" "ChunkEmbeddingStatus" NOT NULL DEFAULT 'SKIPPED',
    "embedding" JSONB,
    "embedding_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_document_id_chunk_index_key" ON "document_chunks"("document_id", "chunk_index");

-- CreateIndex
CREATE INDEX "document_chunks_content_hash_idx" ON "document_chunks"("content_hash");

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
