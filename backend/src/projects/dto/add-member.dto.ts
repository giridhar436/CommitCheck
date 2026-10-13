import { IsEmail, IsEnum } from 'class-validator';
import { ProjectRole } from '@prisma/client';

/**
 * Body for POST /projects/:projectId/members. OWNER is deliberately not
 * addable — the project creator is the owner; ownership transfer is not
 * supported (rejected at service level with a clear message).
 */
export class AddMemberDto {
  /** Supabase Auth email of the user to add — resolved server-side to a user id. */
  @IsEmail()
  email!: string;

  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
