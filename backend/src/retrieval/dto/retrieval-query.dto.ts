import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Query for GET /api/projects/:projectId/retrieval/scope.
 * `query` is plain user text (a commitment title, a feature description…).
 */
export class RetrievalQueryDto {
  @IsString()
  @MaxLength(500, { message: 'query must not exceed 500 characters' })
  query!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
