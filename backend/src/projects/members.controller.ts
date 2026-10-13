import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ProjectMembersService } from './project-members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ProjectMemberResponseDto } from './dto/member-response.dto';
import { ApiResponse } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { ProjectAccess } from '../access/project-access.decorator';

/**
 * Project membership management (Phase 15 RBAC). Reading requires any
 * membership; every mutation requires an ADMIN/OWNER. The spec's own-role
 * and owner-protection rules are enforced in ProjectMembersService.
 */
@Controller('projects/:projectId/members')
export class MembersController {
  constructor(private readonly membersService: ProjectMembersService) {}

  @ProjectAccess('read')
  @Get()
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ApiResponse<ProjectMemberResponseDto[]>> {
    return {
      success: true,
      message: 'Project members fetched successfully',
      data: await this.membersService.list(projectId),
    };
  }

  @ProjectAccess('admin')
  @Post()
  async add(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<ProjectMemberResponseDto>> {
    return {
      success: true,
      message: 'Member added successfully',
      data: await this.membersService.add(projectId, dto, user),
    };
  }

  @ProjectAccess('admin')
  @Patch(':userId')
  async updateRole(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<ProjectMemberResponseDto>> {
    return {
      success: true,
      message: 'Member role updated successfully',
      data: await this.membersService.updateRole(projectId, userId, dto, user),
    };
  }

  @ProjectAccess('admin')
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<{ id: string; userId: string }>> {
    return {
      success: true,
      message: 'Member removed successfully',
      data: await this.membersService.remove(projectId, userId, user),
    };
  }
}
