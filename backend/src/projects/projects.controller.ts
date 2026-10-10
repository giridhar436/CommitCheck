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

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @Query() query: GetProjectsQueryDto,
  ): Promise<ApiResponse<Paginated<ProjectResponseDto>>> {
    return {
      success: true,
      message: 'Projects fetched successfully',
      data: await this.projectsService.findAll(query),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return {
      success: true,
      message: 'Project fetched successfully',
      data: await this.projectsService.findOne(id),
    };
  }

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return {
      success: true,
      message: 'Project created successfully',
      data: await this.projectsService.create(dto),
    };
  }

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
