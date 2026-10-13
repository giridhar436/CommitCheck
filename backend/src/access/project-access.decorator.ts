import { SetMetadata } from '@nestjs/common';
import type { ProjectAccessLevel } from './project-access.service';

export const PROJECT_ACCESS_KEY = 'projectAccessLevel';

/**
 * Declares the access level a project-scoped route requires; the global
 * ProjectAccessGuard reads this and enforces it via ProjectAccessService.
 *
 *   @ProjectAccess('read')    → any member (VIEWER+)
 *   @ProjectAccess('write')   → MEMBER and above
 *   @ProjectAccess('admin')   → ADMIN and above (approvals, member management)
 *   @ProjectAccess('owner')   → project owner only (project deletion)
 *
 * The guard resolves the project id from the `:projectId` route param, or
 * `:id` on the /projects/:id routes themselves. Routes without either param
 * (list, create) are not annotated — they enforce identity differently
 * (membership-scoped queries / implicit owner on creation).
 */
export const ProjectAccess = (level: ProjectAccessLevel) =>
  SetMetadata(PROJECT_ACCESS_KEY, level);
