import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';

/**
 * Root module.
 * Phase 1: database layer · Phase 2: Projects API.
 */
@Module({
  imports: [PrismaModule, ProjectsModule],
})
export class AppModule {}
