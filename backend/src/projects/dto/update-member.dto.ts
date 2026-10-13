import { IsEnum } from 'class-validator';
import { ProjectRole } from '@prisma/client';

/** Body for PATCH /projects/:projectId/members/:userId. */
export class UpdateMemberDto {
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
