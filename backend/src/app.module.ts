import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ScopeRequirementsModule } from './scope-requirements/scope-requirements.module';
import { MeetingsModule } from './meetings/meetings.module';
import { MeetingAttachmentsModule } from './meeting-attachments/meeting-attachments.module';
import { CommitmentsModule } from './commitments/commitments.module';
import { CommitmentEvidenceModule } from './commitment-evidence/commitment-evidence.module';
import { MeetingAnalysisModule } from './meeting-analysis/meeting-analysis.module';
import { ScopeVerificationModule } from './scope-verification/scope-verification.module';
import { ChangeRequestsModule } from './change-requests/change-requests.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';

/**
 * Root module.
 * Phase 1: database · Phase 2: Projects · Phase 3: Scope Requirements ·
 * Phase 4: Meetings · Phase 5: Meeting Attachments · Phase 6: Commitments ·
 * Phase 7: Commitment Evidence · Phase 8: AI Meeting Analysis ·
 * Phase 9: Fireworks AI provider · Phase 10: Scope Verification ·
 * Phase 11: Change Request workflow · Phase 12: Dashboard & audit intelligence ·
 * Phase 13: Scope & document intelligence.
 */
@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    ScopeRequirementsModule,
    MeetingsModule,
    MeetingAttachmentsModule,
    CommitmentsModule,
    CommitmentEvidenceModule,
    MeetingAnalysisModule,
    ScopeVerificationModule,
    ChangeRequestsModule,
    DashboardModule,
    DocumentsModule,
  ],
})
export class AppModule {}
