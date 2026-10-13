import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PROJECT_ACCESS_KEY } from './project-access.decorator';
import { ProjectAccessService } from './project-access.service';
import type { ProjectAccessLevel } from './project-access.service';
import type { AuthUser } from '../auth/auth-user.interface';

/**
 * Global authorization guard (Phase 15). Runs after SupabaseAuthGuard and
 * enforces whatever @ProjectAccess(level) declared on the route — the
 * single centralized enforcement point for project isolation + RBAC.
 * Routes without the decorator (GET/POST /projects, /auth/me) pass through;
 * those enforce identity in the service (membership-scoped queries).
 */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const level = this.reflector.get<ProjectAccessLevel>(
      PROJECT_ACCESS_KEY,
      context.getHandler(),
    );
    if (!level) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.authUser;
    if (!user) {
      // SupabaseAuthGuard runs first in practice; this is a hard backstop so
      // ordering can never route an unauthenticated request into authorization.
      throw new UnauthorizedException('Authentication required');
    }

    // Child resources use :projectId; the /projects/:id routes use :id.
    const projectId: string | undefined = request.params?.projectId ?? request.params?.id;
    if (!projectId) return true;

    // Guards run before pipes, so a malformed id would otherwise reach the
    // database as part of the membership lookup (a Prisma 500). Fail closed
    // with the same 400 ParseUUIDPipe would have produced.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      throw new BadRequestException('validation failed for param (uuid expected)');
    }

    request.projectAccess = await this.projectAccess.assertAccess(
      projectId,
      user.id,
      level,
    );
    return true;
  }
}
