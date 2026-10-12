import { ActivitySummaryDto } from '../../projects/dto/project-response.dto';

/** Extracted text — detail responses only, never list items. */
export class DocumentTextDto {
  content!: string;
  charCount!: number;
  processedAt!: string;
  updatedAt!: string;
}

/** Scope requirements traced back to this document (detail responses only). */
export class DocumentSourceRequirementDto {
  id!: string;
  title!: string;
  category!: string;
  approvalStatus!: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING';
  createdAt!: string;
}

/** List-item JSON contract for a document (metadata only — no text blobs). */
export class DocumentResponseDto {
  id!: string;
  projectId!: string;
  title!: string;
  type!: 'SOW' | 'CONTRACT' | 'PROPOSAL' | 'REQUIREMENTS' | 'OTHER';
  storagePath!: string;
  fileSize!: number | null;
  processingStatus!: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processedAt!: string | null;
  processingError!: string | null;
  uploadedAt!: string;
  createdAt!: string;
  updatedAt!: string;
  latestActivity!: ActivitySummaryDto | null;
}

/** Detail contract — adds extracted text + traceability to requirements. */
export class DocumentDetailDto extends DocumentResponseDto {
  extractedText!: DocumentTextDto | null;
  sourceRequirements!: DocumentSourceRequirementDto[];
}
