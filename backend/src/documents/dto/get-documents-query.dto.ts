import { IsIn, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DocumentType } from '@prisma/client';

/** GET /projects/:projectId/documents query. */
export class GetDocumentsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(['createdAt', 'uploadedAt', 'title'])
  declare sortBy: string;

  /** Title search. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare search: string;

  /** Filter by the existing DocumentType enum. */
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}
