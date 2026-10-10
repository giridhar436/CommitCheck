import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectDto {
  /** Human-readable project name, unique per client (case-insensitive). */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Project name cannot be empty' })
  @MaxLength(120)
  name!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Client name is required' })
  @MaxLength(120)
  clientName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Decimal(12,2) in the database; sent as a JSON number. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Budget cannot be negative' })
  budget?: number;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date' })
  endDate?: string;

  /** Defaults to ACTIVE when omitted. */
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
