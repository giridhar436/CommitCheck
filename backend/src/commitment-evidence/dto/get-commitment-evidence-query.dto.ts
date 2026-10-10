import { IsIn, IsOptional } from 'class-validator';
import {
  PaginationDto,
  SORT_DIRECTIONS,
  SortDirection,
} from '../../common/dto/pagination.dto';

/**
 * GET /projects/:projectId/commitments/:commitmentId/evidence query.
 * Redeclares the sort fields WITH initializers to override the shared
 * defaults (timestamp ASC instead of createdAt desc) for this resource.
 */
export class GetCommitmentEvidenceQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['timestamp', 'createdAt'])
  sortBy: string = 'timestamp';

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  sortOrder: SortDirection = 'asc';
}
