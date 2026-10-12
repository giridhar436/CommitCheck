import { Document, DocumentText } from '@prisma/client';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';
import {
  DocumentDetailDto,
  DocumentResponseDto,
  DocumentSourceRequirementDto,
} from './dto/document-response.dto';

/** Maps a Prisma row to the API's JSON contract (dates → ISO strings). */
export class DocumentsMapper {
  static toResponseDto(
    document: Document,
    latestActivity?: ActivitySummaryDto | null,
  ): DocumentResponseDto {
    return {
      id: document.id,
      projectId: document.projectId,
      title: document.title,
      type: document.type,
      storagePath: document.storagePath,
      fileSize: document.fileSize ?? null,
      processingStatus: document.processingStatus,
      processedAt: document.processedAt?.toISOString() ?? null,
      processingError: document.processingError ?? null,
      uploadedAt: document.uploadedAt.toISOString(),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      latestActivity: latestActivity ?? null,
    };
  }

  static toDetailDto(
    document: Document & { extractedText: DocumentText | null },
    sourceRequirements: DocumentSourceRequirementDto[],
    latestActivity?: ActivitySummaryDto | null,
  ): DocumentDetailDto {
    return {
      ...this.toResponseDto(document, latestActivity),
      extractedText: document.extractedText
        ? {
            content: document.extractedText.content,
            charCount: document.extractedText.charCount,
            processedAt: document.processedAt?.toISOString() ?? document.extractedText.updatedAt.toISOString(),
            updatedAt: document.extractedText.updatedAt.toISOString(),
          }
        : null,
      sourceRequirements,
    };
  }
}
