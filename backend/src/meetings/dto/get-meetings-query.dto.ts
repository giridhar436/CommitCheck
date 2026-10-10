import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';
import { MeetingAnalysisStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** GET /projects/:projectId/meetings query: pagination + search + date/status filters. */
export class GetMeetingsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['meetingDate', 'title', 'createdAt'])
  declare sortBy: string;

  @IsOptional()
  @IsEnum(MeetingAnalysisStatus)
  analysisStatus?: MeetingAnalysisStatus;

  /** Inclusive lower bound on meetingDate. */
  @IsOptional()
  @IsDateString({}, { message: 'meetingDateFrom must be a valid ISO 8601 date' })
  meetingDateFrom?: string;

  /** Inclusive upper bound on meetingDate. */
  @IsOptional()
  @IsDateString({}, { message: 'meetingDateTo must be a valid ISO 8601 date' })
  meetingDateTo?: string;
}
