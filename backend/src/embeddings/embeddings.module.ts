import { Global, Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';

/**
 * Phase 14 — global embedding infrastructure. Consumed by the documents
 * module (chunk indexing) and the retrieval module (query embedding).
 */
@Global()
@Module({
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
