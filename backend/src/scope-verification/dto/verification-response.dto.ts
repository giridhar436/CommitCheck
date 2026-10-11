/** Where a confirmed authorization came from — always application state. */
export type VerificationAuthorizationSource = 'APPROVED_SCOPE' | 'CHANGE_REQUEST';

/** Minimal snapshot of the scope requirement a commitment matched. */
export class MatchedScopeRequirementDto {
  id!: string;
  title!: string;
  category!: string;
  approvalStatus!: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING';
}

/**
 * Deterministic scope-verification result. scopeMatch is `true` (covered
 * by an approved requirement), `false` (no meaningful overlap) or `null`
 * (ambiguous — needs human review). Authorization is derived exclusively
 * from database state (approved scope / APPROVED change requests), never
 * from AI output.
 */
export class CommitmentVerificationResponseDto {
  commitmentId!: string;
  scopeMatch!: boolean | null;
  matchedScopeRequirement!: MatchedScopeRequirementDto | null;
  authorizationFound!: boolean;
  authorizationSource!: VerificationAuthorizationSource | null;
  risk!: 'LOW' | 'MEDIUM' | 'HIGH';
  authorizationStatus!: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING';
  explanation!: string;
  evidence!: string[];
  verifiedAt!: string;
}
