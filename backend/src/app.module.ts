import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ScopeRequirementsModule } from './scope-requirements/scope-requirements.module';

/**
 * Root module.
 * Phase 1: database layer · Phase 2: Projects API · Phase 3: Scope Requirements API.
 */
@Module({
  imports: [PrismaModule, ProjectsModule, ScopeRequirementsModule],
})
export class AppModule {}
