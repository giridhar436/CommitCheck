import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { ActivityAction } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * Project-scoped activity/audit list query (established pagination
 * conventions). `action` filters by the existing ActivityAction enum.
 * Sorting is whitelisted to `createdAt` only — `action` is a Postgres
 * enum, so ordering by it yields declaration-ordinal (meaningless) order.
 */
export class GetActivityQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['createdAt'])
  declare sortBy: string;

  @IsOptional()
  @IsEnum(ActivityAction)
  action?: ActivityAction;
}
