import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EvidenceSource } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCommitmentEvidenceDto {
  /** Verbatim transcript quote supporting the commitment. Immutable by design. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'quote cannot be empty' })
  @MaxLength(5000)
  quote!: string;

  /** Moment the quote was said; stays null when omitted. */
  @IsOptional()
  @IsDateString({}, { message: 'timestamp must be a valid ISO 8601 date' })
  timestamp?: string;

  /** Where the quote came from — required, no default at the API layer. */
  @Transform(trim)
  @IsNotEmpty({ message: 'source is required' })
  @IsEnum(EvidenceSource, {
    message: 'source must be one of: TRANSCRIPT, SUMMARY, NOTES, RECORDING, DOCUMENT, OTHER',
  })
  source!: EvidenceSource;
}
