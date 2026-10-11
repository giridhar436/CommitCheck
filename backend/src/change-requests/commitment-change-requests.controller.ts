import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestDetailDto } from './dto/change-request-response.dto';
import { ApiResponse } from '../common/api-response';

/**
 * Phase 11 — Generation trigger: turns an unauthorized, out-of-scope
 * (HIGH risk) commitment into a change request. Takes NO body — every fact
 * is derived server-side from the commitment and its Phase 10 verification;
 * the client cannot author or rewrite commitment facts.
 */
@Controller('projects/:projectId/commitments/:commitmentId/change-request')
export class CommitmentChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  @Post()
  async generate(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
  ): Promise<ApiResponse<ChangeRequestDetailDto>> {
    return {
      success: true,
      message: 'Change request generated',
      data: await this.changeRequestsService.generate(projectId, commitmentId),
    };
  }
}
