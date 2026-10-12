/**
 * Phase 14 — semantic scope retrieval contracts.
 *
 * Retrieval is CANDIDATE DISCOVERY only. `score` is retrieval relevance
 * (cosine similarity in vector mode, deterministic lexical coverage in
 * lexical mode) — it is NEVER authorization confidence and can never
 * authorize a commitment. Every `text` value is grounded in stored content
 * (a document chunk or a scope requirement) — nothing is synthesized.
 */

export type RetrievalSourceType = 'DOCUMENT_CHUNK' | 'SCOPE_REQUIREMENT';
export type RetrievalSimilarityKind = 'cosine' | 'lexical';
export type RetrievalMode = 'lexical' | 'vector';

/** A requirement linked (sourceDocumentId) to the document a chunk came from. */
export class RetrievalLinkedRequirementDto {
  id!: string;
  title!: string;
  category!: string;
  approvalStatus!: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING';
}

export class RetrievalResultItemDto {
  sourceType!: RetrievalSourceType;
  /** Chunk id (DOCUMENT_CHUNK) or requirement id (SCOPE_REQUIREMENT). */
  sourceId!: string;
  documentId!: string | null;
  documentTitle!: string | null;
  requirementId!: string | null;
  requirementTitle!: string | null;
  /** Grounded excerpt: stored chunk text / requirement content. */
  text!: string;
  /** Retrieval relevance 0..1 — NOT authorization confidence. */
  score!: number;
  similarityKind!: RetrievalSimilarityKind;
  metadata!: {
    documentType: string | null;
    chunkIndex: number | null;
    charStart: number | null;
    charEnd: number | null;
  };
  /** Requirements traced to the source document, when they exist. */
  linkedRequirements!: RetrievalLinkedRequirementDto[];
}

export class RetrievalScopeResponseDto {
  /** 'vector' only when a real provider is configured AND chunks are indexed;
   *  otherwise 'lexical' (deterministic). Lexical is never labeled vector. */
  mode!: RetrievalMode;
  provider!: { active: boolean; model: string | null; reason: string | null };
  query!: string;
  results!: RetrievalResultItemDto[];
}
