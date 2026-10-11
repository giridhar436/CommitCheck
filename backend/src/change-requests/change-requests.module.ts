import { Module } from '@nestjs/common';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestsController } from './change-requests.controller';
import { CommitmentChangeRequestsController } from './commitment-change-requests.controller';
import { ScopeVerificationModule } from '../scope-verification/scope-verification.module';

/**
 * Phase 11 — Change Request generation & approval workflow.
 * Generation rules are enforced through the Phase 10 verification service
 * (imported module); approval/rejection/clarification are transactional,
 * race-safe state transitions on the existing ChangeRequest model.
 */
@Module({
  imports: [ScopeVerificationModule],
  controllers: [ChangeRequestsController, CommitmentChangeRequestsController],
  providers: [ChangeRequestsService],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
