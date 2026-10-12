import { Module } from '@nestjs/common';
import { ScopeVerificationService } from './scope-verification.service';
import { ScopeVerificationController } from './scope-verification.controller';
import { RetrievalModule } from '../retrieval/retrieval.module';

/**
 * Phase 10 — Scope Verification & Authorization Intelligence.
 * Deterministic DB-backed scope matching + authorization checks for
 * commitments. PrismaModule is global, so only the service needs to be
 * provided/exported here; the meeting-analysis module reuses the service
 * for post-transaction verification of freshly analyzed commitments.
 * RetrievalModule (Phase 14) supplies the optional, non-authorizing
 * retrieved-context enrichment.
 */
@Module({
  imports: [RetrievalModule],
  controllers: [ScopeVerificationController],
  providers: [ScopeVerificationService],
  exports: [ScopeVerificationService],
})
export class ScopeVerificationModule {}
