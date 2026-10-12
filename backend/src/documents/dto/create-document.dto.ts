import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateDocumentDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'title cannot be empty' })
  @MaxLength(255)
  title!: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  /** Supabase Storage object path; bucket-prefixed so paths can't be forged.
   *  Metadata-only — the API never touches the storage object itself. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'storagePath cannot be empty' })
  @MaxLength(500)
  @Matches(/^projects\/.+/, {
    message:
      'storagePath must begin with projects/ (e.g. projects/project-id/docs/sow-v3.pdf)',
  })
  storagePath!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'fileSize cannot be negative' })
  fileSize?: number;

  /** Defaults to now() when omitted (database default). */
  @IsOptional()
  @IsDateString({}, { message: 'uploadedAt must be a valid ISO 8601 date' })
  uploadedAt?: string;
}
