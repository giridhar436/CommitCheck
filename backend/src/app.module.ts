import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ScopeRequirementsModule } from './scope-requirements/scope-requirements.module';
import { MeetingsModule } from './meetings/meetings.module';
import { MeetingAttachmentsModule } from './meeting-attachments/meeting-attachments.module';
import { CommitmentsModule } from './commitments/commitments.module';

/**
 * Root module.
 * Phase 1: database · Phase 2: Projects · Phase 3: Scope Requirements ·
 * Phase 4: Meetings · Phase 5: Meeting Attachments · Phase 6: Commitments.
 */
@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    ScopeRequirementsModule,
    MeetingsModule,
    MeetingAttachmentsModule,
    CommitmentsModule,
  ],
})
export class AppModule {}
