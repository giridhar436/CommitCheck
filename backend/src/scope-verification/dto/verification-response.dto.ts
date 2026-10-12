/** Where a confirmed authorization came from — always application state. */
export type VerificationAuthorizationSource = 'APPROVED_SCOPE' | 'CHANGE_REQUEST';

/** Minimal snapshot of the project document a requirement was sourced from. */
export class MatchedSourceDocumentDto {
  id!: string;
  title!: string;
}

/** Minimal snapshot of the scope requirement a commitment matched. */
export class MatchedScopeRequirementDto {
  id!: string;
  title!: string;
  category!: string;
  approvalStatus!: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING';
  /** Phase 13 — source document when the requirement declares one; null otherwise. */
  sourceDocument!: MatchedSourceDocumentDto | null;
}

/**
 * Deterministic scope-verification result. scopeMatch is `true` (covered
 * by an approved requirement), `false` (no meaningful overlap) or `null`
 * (ambiguous — needs human review). Authorization is derived exclusively
 * from database state (approved scope / APPROVED change requests), never
 * from AI output.
 *
 * Phase 14: `retrievedContext` (optional) carries document-chunk excerpts
 * found by semantic retrieval when no authorization was found. It is
 * retrieval RELEVANCE context for human review — grounded in stored chunk
 * text, never synthesized — and it NEVER participates in the decision.
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
  retrievedContext?: RetrievedContextItemDto[];
}

/** One retrieved chunk excerpt (Phase 14). `relevance` is retrieval
 *  similarity 0..1 — NOT authorization confidence. */
export class RetrievedContextItemDto {
  documentId!: string;
  documentTitle!: string;
  chunkIndex!: number;
  text!: string;
  relevance!: number;
}
