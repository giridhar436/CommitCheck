import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RiskLevel } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCommitmentDto {
  /** Duplicate titles are allowed (commitments repeat across meetings). */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @MaxLength(200)
  title!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(5000)
  description!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Speaker is required' })
  @MaxLength(120)
  speaker!: string;

  /** The meeting this commitment was detected in — verified against the project. */
  @IsUUID(undefined, { message: 'meetingId must be a valid UUID' })
  meetingId!: string;

  /** Defaults to LOW when omitted. */
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  /** AI confidence 0–1. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'confidenceScore must be at least 0' })
  @Max(1, { message: 'confidenceScore must be at most 1' })
  confidenceScore?: number;

  /** Pointer into the meeting transcript/document (storage or doc reference). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  evidenceReference?: string;
}
