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

/**
 * Phase 14 — read-only semantic scope retrieval, nested under its project.
 * Candidate discovery only: results explain and help humans review; they
 * never authorize commitments.
 */
@Controller('projects/:projectId/retrieval')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

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
