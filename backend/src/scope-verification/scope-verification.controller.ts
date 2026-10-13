import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ScopeVerificationService } from './scope-verification.service';
import { CommitmentVerificationResponseDto } from './dto/verification-response.dto';
import { ApiResponse } from '../common/api-response';
import { ProjectAccess } from '../access/project-access.decorator';

/**
 * Phase 10 — Scope verification trigger. Commitments are always nested
 * under their project; verification is an idempotent action (repeat runs
 * with unchanged inputs return the same result without duplicate audits),
 * so POST returning the current verdict is sufficient. The latest stored
 * outcome is already readable via the commitment detail's latestActivity
 * and riskLevel/authorizationStatus — no extra GET endpoint.
 */
@Controller('projects/:projectId/commitments/:commitmentId/verify')
export class ScopeVerificationController {
  constructor(
    private readonly scopeVerificationService: ScopeVerificationService,
  ) {}

  @ProjectAccess('write')
  @Post()
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
  ): Promise<ApiResponse<CommitmentVerificationResponseDto>> {
    return {
      success: true,
      message: 'Commitment scope verified',
      data: await this.scopeVerificationService.verifyCommitment(
        projectId,
        commitmentId,
      ),
    };
  }
}
