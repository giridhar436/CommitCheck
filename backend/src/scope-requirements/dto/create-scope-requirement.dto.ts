import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApprovalStatus, Priority } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateScopeRequirementDto {
  /** Unique per project (case-insensitive). */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  @MaxLength(100)
  category!: string;

  /** Defaults to MEDIUM when omitted. */
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  /** Defaults to PENDING when omitted. */
  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  /** Contract/SOW clause this requirement originates from. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  sourceClause?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  acceptanceCriteria?: string;

  /** Phase 13 traceability: the project document this requirement came from.
   *  Optional — manual requirements leave it null. Must reference a document
   *  of the SAME project (validated by the service; cross-project → 400). */
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;
}
