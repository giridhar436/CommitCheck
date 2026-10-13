import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Project, ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Access levels a route can require. Ranked the same way as ProjectRole so
 * a single comparison enforces the hierarchy:
 *   VIEWER(1) < MEMBER(2) < ADMIN(3) < OWNER(4)
 */
export type ProjectAccessLevel = 'read' | 'write' | 'admin' | 'owner';

const ROLE_RANK: Record<ProjectRole, number> = {
  [ProjectRole.VIEWER]: 1,
  [ProjectRole.MEMBER]: 2,
  [ProjectRole.ADMIN]: 3,
  [ProjectRole.OWNER]: 4,
};

const LEVEL_RANK: Record<ProjectAccessLevel, number> = {
  read: 1,
  write: 2,
  admin: 3,
  owner: 4,
};

/** Result of a successful access check, stashed on the request for handlers. */
export interface ProjectAccessContext {
  project: Project;
  role: ProjectRole;
}

/**
 * Phase 15 — centralized project authorization (the single enforcement
 * point for project isolation and RBAC; controllers only declare intent
 * via @ProjectAccess, guards call this service).
 *
 * Rules:
 *  - No membership → 404 with the standard "not found" message: a
 *    non-member must not be able to distinguish "project exists" from
 *    "project does not exist" (no existence leak / no IDOR oracle).
 *  - Membership with insufficient role → 403 (authentication worked,
 *    authorization failed).
 *  - Legacy projects created before memberships existed keep their
 *    `ownerUserId` working as an implicit OWNER (read-only fallback —
 *    no implicit membership row is created on the read path).
 */
@Injectable()
export class ProjectAccessService {
  private readonly logger = new Logger(ProjectAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(
    projectId: string,
    userId: string,
    level: ProjectAccessLevel,
  ): Promise<ProjectAccessContext> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { project: true },
    });

    if (membership) {
      this.enforce(membership.role, level, projectId);
      return { project: membership.project, role: membership.role };
    }

    // Membership missing: legacy owner fallback, then a uniform 404.
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (project && project.ownerUserId === userId) {
      return { project, role: ProjectRole.OWNER };
    }

    throw new NotFoundException(`Project with id ${projectId} not found`);
  }

  /**
   * Silent variant for flows that need the context but handle denial
   * themselves (e.g. listing projects returns only accessible rows).
   */
  async getAccess(
    projectId: string,
    userId: string,
  ): Promise<ProjectAccessContext | null> {
    try {
      return await this.assertAccess(projectId, userId, 'read');
    } catch {
      return null;
    }
  }

  private enforce(role: ProjectRole, level: ProjectAccessLevel, projectId: string): void {
    if (ROLE_RANK[role] < LEVEL_RANK[level]) {
      // Logged (auditable access failure) — never echoes other users' data.
      this.logger.warn(
        `Access denied: role ${role} below required ${level} for project ${projectId}`,
      );
      throw new ForbiddenException(
        `Project access denied: ${level === 'owner' ? 'project owner' : `${level} role or higher`} required`,
      );
    }
  }
}
