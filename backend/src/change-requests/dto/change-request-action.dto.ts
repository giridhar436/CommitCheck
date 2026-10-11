import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Shared decision body for approve/reject. The reason is optional and never
 * required to act — the approval action itself is the authority.
 */
export class ChangeRequestDecisionDto {
  /** Free-text rationale recorded with the decision. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000, { message: 'Reason must be at most 2000 characters' })
  reason?: string;
}

export class RequestClarificationDto {
  /** What the requester needs clarified — required, non-empty. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Clarification comment cannot be empty' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters' })
  comment!: string;
}
