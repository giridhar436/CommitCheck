import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApprovalStatus, RiskLevel } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

/** Shared query for both list surfaces (project-scoped and meeting-scoped). */
export class GetCommitmentsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'title', 'confidenceScore', 'riskLevel'])
  declare sortBy: string;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  authorizationStatus?: ApprovalStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  /** Exact, case-insensitive match on the speaker. */
  @IsOptional()
  @IsString()
  speaker?: string;

  /** Only meaningful on the project-scoped list. */
  @IsOptional()
  @IsUUID(undefined, { message: 'meetingId must be a valid UUID' })
  meetingId?: string;
}
