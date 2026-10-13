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
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { ProjectAccess } from '../access/project-access.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @Query() query: GetProjectsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<Paginated<ProjectResponseDto>>> {
    return {
      success: true,
      message: 'Projects fetched successfully',
      data: await this.projectsService.findAll(query, user.id),
    };
  }

  @ProjectAccess('read')
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return {
      success: true,
      message: 'Project fetched successfully',
      data: await this.projectsService.findOne(id, user.id),
    };
  }

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return {
      success: true,
      message: 'Project created successfully',
      data: await this.projectsService.create(dto, user),
    };
  }

  @ProjectAccess('admin')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return {
      success: true,
      message: 'Project updated successfully',
      data: await this.projectsService.update(id, dto),
    };
  }

  @ProjectAccess('owner')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const deleted = await this.projectsService.remove(id);
    return {
      success: true,
      message: 'Project deleted successfully',
      data: { id: deleted.id },
    };
  }
}
