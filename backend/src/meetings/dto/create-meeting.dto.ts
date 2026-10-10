import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MeetingAnalysisStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMeetingDto {
  /** Duplicate titles are allowed across (and within) projects. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  @IsDateString({}, { message: 'meetingDate must be a valid ISO 8601 date' })
  meetingDate!: string;

  /** Defaults to NOT_STARTED when omitted; the AI pipeline owns later states. */
  @IsOptional()
  @IsEnum(MeetingAnalysisStatus)
  analysisStatus?: MeetingAnalysisStatus;
}
