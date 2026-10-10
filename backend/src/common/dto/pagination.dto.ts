import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Sort fields every list endpoint allows (extend per-resource query DTOs). */
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/**
 * Reusable pagination/search/sort query for all list endpoints.
 * Resource-specific filters (e.g. project status) live in subclasses.
 */
export class PaginationDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  /** Case-insensitive substring search (defined per resource). */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['name', 'clientName', 'startDate', 'createdAt', 'updatedAt'])
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  sortOrder: SortDirection = 'desc';

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
