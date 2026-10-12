import { Module } from '@nestjs/common';
import { RetrievalController } from './retrieval.controller';
import { RetrievalService } from './retrieval.service';

/**
 * Phase 14 — semantic scope retrieval (candidate discovery only).
 * EmbeddingsModule is global; PrismaModule is global.
 */
@Module({
  controllers: [RetrievalController],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
