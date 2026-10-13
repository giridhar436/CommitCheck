import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';
import { RetrievalScopeResponseDto } from './dto/retrieval-response.dto';
import { ApiResponse } from '../common/api-response';
import { ProjectAccess } from '../access/project-access.decorator';

/**
 * Phase 14 — read-only semantic scope retrieval, nested under its project.
 * Candidate discovery only: results explain and help humans review; they
 * never authorize commitments.
 */
@Controller('projects/:projectId/retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @ProjectAccess('read')
  @Get('scope')
  async retrieveScope(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: RetrievalQueryDto,
  ): Promise<ApiResponse<RetrievalScopeResponseDto>> {
    return {
      success: true,
      message: 'Scope retrieval completed successfully',
      data: await this.retrievalService.retrieveRelevantScope(projectId, query),
    };
  }
}
