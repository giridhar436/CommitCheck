import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ProjectAccessService } from './project-access.service';
import { ProjectAccessGuard } from './project-access.guard';

/**
 * Authorization module (Phase 15) — project isolation + RBAC.
 *
 * Global so every feature module can inject ProjectAccessService, and the
 * ProjectAccessGuard is registered as a second global guard: SupabaseAuthGuard
 * establishes identity, ProjectAccessGuard enforces project access/roles.
 */
@Global()
@Module({
  providers: [
    ProjectAccessService,
    { provide: APP_GUARD, useClass: ProjectAccessGuard },
  ],
  exports: [ProjectAccessService],
})
export class AccessModule {}
