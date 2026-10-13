import { ProjectRole } from '@prisma/client';

/** Row of GET /projects/:projectId/members. */
export class ProjectMemberResponseDto {
  id!: string;
  /** Supabase Auth user id. */
  userId!: string;
  role!: ProjectRole;
  email!: string | null;
  createdAt!: string;
}
