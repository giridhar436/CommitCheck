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
import { ScopeRequirementsService } from './scope-requirements.service';
import { CreateScopeRequirementDto } from './dto/create-scope-requirement.dto';
import { GetScopeRequirementsQueryDto } from './dto/get-scope-requirements-query.dto';
import { UpdateScopeRequirementDto } from './dto/update-scope-requirement.dto';
import { ScopeRequirementResponseDto } from './dto/scope-requirement-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';
import { ProjectAccess } from '../access/project-access.decorator';
import { CurrentAccess } from '../access/current-access.decorator';
import type { ProjectAccessContext } from '../access/project-access.service';

/** Scope requirements are always nested under their project. */
@Controller('projects/:projectId/scope')
export class ScopeRequirementsController {
  constructor(
    private readonly scopeRequirementsService: ScopeRequirementsService,
  ) {}

  @ProjectAccess('read')
  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: GetScopeRequirementsQueryDto,
  ): Promise<ApiResponse<Paginated<ScopeRequirementResponseDto>>> {
    return {
      success: true,
      message: 'Scope requirements fetched successfully',
      data: await this.scopeRequirementsService.findAll(projectId, query),
    };
  }

  @ProjectAccess('read')
  @Get(':id')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ScopeRequirementResponseDto>> {
    return {
      success: true,
      message: 'Scope requirement fetched successfully',
      data: await this.scopeRequirementsService.findOne(projectId, id),
    };
  }

  @ProjectAccess('write')
  @Post()
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateScopeRequirementDto,
    @CurrentAccess() access: ProjectAccessContext,
  ): Promise<ApiResponse<ScopeRequirementResponseDto>> {
    return {
      success: true,
      message: 'Scope requirement created successfully',
      data: await this.scopeRequirementsService.create(projectId, dto, access?.role),
    };
  }

  @ProjectAccess('write')
  @Patch(':id')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScopeRequirementDto,
    @CurrentAccess() access: ProjectAccessContext,
  ): Promise<ApiResponse<ScopeRequirementResponseDto>> {
    return {
      success: true,
      message: 'Scope requirement updated successfully',
      data: await this.scopeRequirementsService.update(projectId, id, dto, access?.role),
    };
  }

  @ProjectAccess('write')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const deleted = await this.scopeRequirementsService.remove(projectId, id);
    return {
      success: true,
      message: 'Scope requirement deleted successfully',
      data: { id: deleted.id },
    };
  }
}
