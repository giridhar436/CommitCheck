import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** type/subtype (RFC 2045 shape) — covers application/pdf, audio/mpeg,
 *  application/vnd.openxmlformats-officedocument.wordprocessingml.document, … */
const MIME_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

export class CreateMeetingAttachmentDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'fileName cannot be empty' })
  @MaxLength(255)
  fileName!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'fileType is required' })
  @Matches(MIME_PATTERN, {
    message: 'fileType must be a valid MIME type (e.g. application/pdf, audio/mpeg, video/mp4)',
  })
  fileType!: string;

  /** Supabase Storage object path; bucket-prefixed so paths can't be forged. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'storagePath cannot be empty' })
  @MaxLength(500)
  @Matches(/^meetings\/.+/, {
    message: 'storagePath must begin with meetings/ (e.g. meetings/project-id/meeting-id/audio.mp3)',
  })
  storagePath!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'fileSize cannot be negative' })
  fileSize!: number;

  /** Defaults to now() when omitted (database default). */
  @IsOptional()
  @IsDateString({}, { message: 'uploadedAt must be a valid ISO 8601 date' })
  uploadedAt?: string;
}
