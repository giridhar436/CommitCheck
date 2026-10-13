import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  ProjectMember,
  ProjectRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import type { AuthUser } from '../auth/auth-user.interface';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ProjectMemberResponseDto } from './dto/member-response.dto';

/**
 * Phase 15 — project membership management.
 *
 * All routes are gated by ProjectAccessGuard ('read' to list, 'admin' to
 * change). Two rules come straight from the Phase 15 spec:
 *  - A user can never change their OWN role through the API (privilege
 *    escalation path closed).
 *  - The project owner's membership role is fixed and they can never be
 *    removed — there is always at least one OWNER per project.
 *
 * MEMBER_ADDED / MEMBER_ROLE_CHANGED / MEMBER_REMOVED audit entries record
 * who did what (actor email) without exposing secrets.
 */
@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  async list(projectId: string): Promise<ProjectMemberResponseDto[]> {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'asc' }],
    });
    return members.map((m) => this.toResponseDto(m));
  }

  async add(
    projectId: string,
    dto: AddMemberDto,
    caller: AuthUser,
  ): Promise<ProjectMemberResponseDto> {
    if (dto.role === ProjectRole.OWNER) {
      throw new BadRequestException(
        'Ownership transfer is not supported — the project creator is always the OWNER',
      );
    }

    // Resolve the Supabase Auth user server-side: the client never supplies
    // user ids that end up in authorization data.
    const user = await this.supabaseAdmin.findUserByEmail(dto.email);
    if (!user) {
      throw new NotFoundException(
        'No Supabase Auth user is registered with that email — they must sign up first',
      );
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException(
        `User ${dto.email} is already a member of this project`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.create({
        data: { projectId, userId: user.id, role: dto.role, email: user.email },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEMBER_ADDED,
          entityType: ActivityEntityType.PROJECT,
          entityId: projectId,
          description: `Member "${user.email}" added with role ${dto.role} by ${caller.email ?? caller.id}`,
        },
      });

      return member;
    });

    return this.toResponseDto(created);
  }

  async updateRole(
    projectId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
    caller: AuthUser,
  ): Promise<ProjectMemberResponseDto> {
    if (targetUserId === caller.id) {
      throw new BadRequestException(
        'You cannot change your own role through the project API',
      );
    }

    const target = await this.getMember(projectId, targetUserId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerUserId: true },
    });
    if (project?.ownerUserId === targetUserId) {
      throw new ForbiddenException(
        "The project owner's role cannot be changed — transfer of ownership is not supported",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.update({
        where: { id: target.id },
        data: { role: dto.role },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEMBER_ROLE_CHANGED,
          entityType: ActivityEntityType.PROJECT,
          entityId: projectId,
          description: `Member "${target.email ?? targetUserId}" role changed from ${target.role} to ${dto.role} by ${caller.email ?? caller.id}`,
        },
      });

      return member;
    });

    return this.toResponseDto(updated);
  }

  async remove(
    projectId: string,
    targetUserId: string,
    caller: AuthUser,
  ): Promise<{ id: string; userId: string }> {
    const target = await this.getMember(projectId, targetUserId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerUserId: true },
    });
    if (project?.ownerUserId === targetUserId) {
      throw new ForbiddenException(
        'The project owner cannot be removed from the project',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({ where: { id: target.id } });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEMBER_REMOVED,
          entityType: ActivityEntityType.PROJECT,
          entityId: projectId,
          description: `Member "${target.email ?? targetUserId}" removed by ${caller.email ?? caller.id}`,
        },
      });
    });

    return { id: target.id, userId: target.userId };
  }

  // ——— helpers ———

  private async getMember(
    projectId: string,
    targetUserId: string,
  ): Promise<ProjectMember> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!member) {
      throw new NotFoundException(
        `Member with user id ${targetUserId} not found in this project`,
      );
    }
    return member;
  }

  private toResponseDto(member: ProjectMember): ProjectMemberResponseDto {
    return {
      id: member.id,
      userId: member.userId,
      role: member.role,
      email: member.email,
      createdAt: member.createdAt.toISOString(),
    };
  }
}
