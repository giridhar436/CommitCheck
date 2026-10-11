import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ChangeRequestsService } from './change-requests.service';
import {
  ChangeRequestDecisionDto,
  RequestClarificationDto,
} from './dto/change-request-action.dto';
import {
  ChangeRequestDetailDto,
  ChangeRequestResponseDto,
} from './dto/change-request-response.dto';
import { GetChangeRequestsQueryDto } from './dto/get-change-requests-query.dto';
import { ApiResponse, Paginated } from '../common/api-response';

/**
 * Phase 11 — Change Request retrieval & decision workflow.
 * Decisions (approve/reject/clarification) are deliberate POST actions;
 * invalid state transitions return 409. Approval is the only path that
 * authorizes the originating commitment.
 */
@Controller('projects/:projectId/change-requests')
export class ChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: GetChangeRequestsQueryDto,
  ): Promise<ApiResponse<Paginated<ChangeRequestResponseDto>>> {
    return {
      success: true,
      message: 'Change requests fetched successfully',
      data: await this.changeRequestsService.findAllByProject(projectId, query),
    };
  }

  @Get(':changeRequestId')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('changeRequestId', ParseUUIDPipe) changeRequestId: string,
  ): Promise<ApiResponse<ChangeRequestDetailDto>> {
    return {
      success: true,
      message: 'Change request fetched successfully',
      data: await this.changeRequestsService.findOne(projectId, changeRequestId),
    };
  }

  @Post(':changeRequestId/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('changeRequestId', ParseUUIDPipe) changeRequestId: string,
    @Body() body: ChangeRequestDecisionDto,
  ): Promise<ApiResponse<ChangeRequestDetailDto>> {
    return {
      success: true,
      message: 'Change request approved — commitment authorized',
      data: await this.changeRequestsService.approve(
        projectId,
        changeRequestId,
        body.reason,
      ),
    };
  }

  @Post(':changeRequestId/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('changeRequestId', ParseUUIDPipe) changeRequestId: string,
    @Body() body: ChangeRequestDecisionDto,
  ): Promise<ApiResponse<ChangeRequestDetailDto>> {
    return {
      success: true,
      message: 'Change request rejected',
      data: await this.changeRequestsService.reject(
        projectId,
        changeRequestId,
        body.reason,
      ),
    };
  }

  @Post(':changeRequestId/clarification')
  @HttpCode(HttpStatus.OK)
  async requestClarification(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('changeRequestId', ParseUUIDPipe) changeRequestId: string,
    @Body() body: RequestClarificationDto,
  ): Promise<ApiResponse<ChangeRequestDetailDto>> {
    return {
      success: true,
      message: 'Clarification requested',
      data: await this.changeRequestsService.requestClarification(
        projectId,
        changeRequestId,
        body.comment,
      ),
    };
  }
}
