import { IsIn, IsEnum, IsOptional } from 'class-validator';
import { ChangeRequestStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** Project-scoped change request list query (established pagination conventions). */
export class GetChangeRequestsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'title', 'status'])
  declare sortBy: string;

  @IsOptional()
  @IsEnum(ChangeRequestStatus)
  status?: ChangeRequestStatus;
}
