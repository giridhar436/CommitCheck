import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CommitmentsService } from './commitments.service';
import { GetCommitmentsQueryDto } from './dto/get-commitments-query.dto';
import { CommitmentResponseDto } from './dto/commitment-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';

/** Read-only commitments surface backing the Meeting Details page. */
@Controller('meetings/:meetingId/commitments')
export class MeetingCommitmentsController {
  constructor(private readonly commitmentsService: CommitmentsService) {}

  @Get()
  async findAllByMeeting(
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Query() query: GetCommitmentsQueryDto,
  ): Promise<ApiResponse<Paginated<CommitmentResponseDto>>> {
    return {
      success: true,
      message: 'Commitments fetched successfully',
      data: await this.commitmentsService.findAllByMeeting(meetingId, query),
    };
  }
}
