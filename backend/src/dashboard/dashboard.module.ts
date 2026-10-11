import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * Phase 12 — Dashboard, alerts & audit intelligence.
 * Read-only module over the existing Activity/Commitment/ChangeRequest
 * models: no schema changes, no AI calls, no client mutations.
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
