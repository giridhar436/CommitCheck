import { PartialType } from '@nestjs/mapped-types';
import { CreateCommitmentDto } from './create-commitment.dto';

/**
 * All fields optional. A new meetingId is re-verified against the project
 * (a commitment cannot be moved to another project's meeting).
 */
export class UpdateCommitmentDto extends PartialType(CreateCommitmentDto) {}
