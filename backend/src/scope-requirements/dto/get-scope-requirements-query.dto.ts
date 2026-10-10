import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus, Priority } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** GET /projects/:projectId/scope query: pagination + search + filters. */
export class GetScopeRequirementsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['title', 'priority', 'createdAt', 'updatedAt'])
  declare sortBy: string;

  /** Exact, case-insensitive match on the requirement category. */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;
}
