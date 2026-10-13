import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiResponse } from '../common/api-response';
import { DashboardService } from './dashboard.service';
import {
  ActivityItemDto,
  AlertDto,
  DashboardResponseDto,
} from './dto/dashboard-response.dto';
import { GetActivityQueryDto } from './dto/get-activity-query.dto';
import { ProjectAccess } from '../access/project-access.decorator';

/** Phase 12 — read-only dashboard, audit and alert intelligence.
 *  Every route is project-scoped and never mutates state. */
@Controller('projects/:projectId')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @ProjectAccess('read')
  @Get('dashboard')
  async getDashboard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ApiResponse<DashboardResponseDto>> {
    return {
      success: true,
      message: 'Project dashboard fetched successfully',
      data: await this.dashboard.getDashboard(projectId),
    };
  }

  @ProjectAccess('read')
  @Get('activity')
  async getActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: GetActivityQueryDto,
  ): Promise<ApiResponse<{ items: ActivityItemDto[]; page: number; limit: number; totalItems: number; totalPages: number }>> {
    return {
      success: true,
      message: 'Project activity fetched successfully',
      data: await this.dashboard.getActivity(projectId, query),
    };
  }

  @ProjectAccess('read')
  @Get('alerts')
  async getAlerts(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ApiResponse<AlertDto[]>> {
    return {
      success: true,
      message: 'Project alerts fetched successfully',
      data: await this.dashboard.getAlerts(projectId),
    };
  }
}
