import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsController } from './projects.controller';
import { MembersController } from './members.controller';
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';

/**
 * Phase 2 projects + Phase 15 membership management.
 * AuthModule provides the Supabase Auth admin lookup used when adding
 * members by email.
 */
@Module({
  imports: [AuthModule],
  controllers: [ProjectsController, MembersController],
  providers: [ProjectsService, ProjectMembersService],
})
export class ProjectsModule {}
