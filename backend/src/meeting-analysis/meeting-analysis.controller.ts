import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { MeetingAnalysisService } from './meeting-analysis.service';
import { MeetingAnalysisResponseDto } from './dto/analysis-response.dto';
import { ApiResponse } from '../common/api-response';
import { ProjectAccess } from '../access/project-access.decorator';

/** Manual AI-analysis trigger, nested under the meeting's project. */
@Controller('projects/:projectId/meetings/:meetingId/analyze')
export class MeetingAnalysisController {
  constructor(private readonly analysisService: MeetingAnalysisService) {}

  /** Thin trigger: UUID parsing/ownership/status rules live in the service. */
  @ProjectAccess('write')
  @Post()
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ): Promise<ApiResponse<MeetingAnalysisResponseDto>> {
    return {
      success: true,
      message: 'Meeting analysis completed successfully',
      data: await this.analysisService.analyzeMeeting(projectId, meetingId),
    };
  }
}
