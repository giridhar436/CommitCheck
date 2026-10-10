import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** GET /projects/:projectId/meetings/:meetingId/attachments query. */
export class GetMeetingAttachmentsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['uploadedAt', 'fileName', 'createdAt'])
  declare sortBy: string;
}
