import { ApprovalStatus, DocumentType, Priority } from '@prisma/client';

/** Phase 13: the project document a requirement was sourced from (null for
 *  manual requirements). Id/title/type only — never the full document payload. */
export class SourceDocumentSummaryDto {
  id!: string;
  title!: string;
  type!: DocumentType;
}

/** Full JSON contract for a scope requirement. */
export class ScopeRequirementResponseDto {
  id!: string;
  projectId!: string;
  title!: string;
  description!: string | null;
  category!: string;
  priority!: Priority;
  approvalStatus!: ApprovalStatus;
  sourceClause!: string | null;
  acceptanceCriteria!: string | null;
  /** Present when the requirement traces to a project document. */
  sourceDocument!: SourceDocumentSummaryDto | null;
  createdAt!: string;
  updatedAt!: string;
}
