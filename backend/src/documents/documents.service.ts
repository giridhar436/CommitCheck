import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Activity,
  ActivityAction,
  ActivityEntityType,
  Document,
  DocumentProcessingStatus,
  DocumentText,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { ProcessDocumentDto } from './dto/process-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import {
  DocumentDetailDto,
  DocumentResponseDto,
  DocumentSourceRequirementDto,
} from './dto/document-response.dto';
import { DocumentsMapper } from './documents.mapper';
import { Paginated } from '../common/api-response';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';

/**
 * Deterministic text normalization: strips the BOM, unifies CRLF/CR to LF,
 * removes control characters (keeping tabs/newlines), trims trailing
 * whitespace per line and collapses runs of blank lines. Pure function of
 * its input — the same content always yields the same text and charCount.
 */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .split('\n')
    .map((line) => line.replace(/^[ \t]+/, '').replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated list for one project: title search + type filter + sorting.
   *  Metadata only — extracted text is never included in list payloads. */
  async findAllByProject(
    projectId: string,
    query: GetDocumentsQueryDto,
  ): Promise<Paginated<DocumentResponseDto>> {
    await this.assertProjectExists(projectId);

    const { page, limit, search, sortBy, sortOrder, skip, type } = query;

    const where: Prisma.DocumentWhereInput = {
      projectId,
      ...(type && { type }),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [documents, totalItems] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    // One batched lookup for the page's latest activities (avoids N+1).
    const docIds = documents.map((d) => d.id);
    const activities = await this.prisma.activity.findMany({
      where: {
        projectId,
        entityType: ActivityEntityType.DOCUMENT,
        entityId: { in: docIds },
      },
      orderBy: { createdAt: 'desc' },
    });
    const latestByDocument = new Map<string, ActivitySummaryDto>();
    for (const activity of activities) {
      if (activity.entityId && !latestByDocument.has(activity.entityId)) {
        latestByDocument.set(activity.entityId, this.toActivitySummary(activity));
      }
    }

    return {
      items: documents.map((document) =>
        DocumentsMapper.toResponseDto(document, latestByDocument.get(document.id) ?? null),
      ),
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    };
  }

  /** Detail: adds the extracted text (processing result) and the scope
   *  requirements traced back to this document. */
  async findOne(projectId: string, id: string): Promise<DocumentDetailDto> {
    const document = await this.findDocumentInProject(projectId, id, true);

    const sourceRequirements = await this.prisma.scopeRequirement.findMany({
      where: { projectId, sourceDocumentId: id },
      select: {
        id: true,
        title: true,
        category: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return DocumentsMapper.toDetailDto(
      document,
      sourceRequirements.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      await this.latestActivityOf(projectId, id),
    );
  }

  /** Creates the metadata row (the binary lives in Supabase Storage, uploaded
   *  out of band) + DOCUMENT_UPLOADED audit entry. */
  async create(projectId: string, dto: CreateDocumentDto): Promise<DocumentResponseDto> {
    await this.assertProjectExists(projectId);

    const document = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          projectId,
          title: dto.title,
          type: dto.type,
          storagePath: dto.storagePath,
          ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
          ...(dto.uploadedAt !== undefined && { uploadedAt: new Date(dto.uploadedAt) }),
        },
      });

      const activity = await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.DOCUMENT_UPLOADED,
          entityType: ActivityEntityType.DOCUMENT,
          entityId: created.id,
          description: `Document "${created.title}" (${created.type}) added to project`,
        },
      });

      return { created, activity };
    });

    return DocumentsMapper.toResponseDto(document.created, this.toActivitySummary(document.activity));
  }

  /** Partial update of editable metadata fields + DOCUMENT_UPDATED audit entry. */
  async update(
    projectId: string,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const existing = await this.findDocumentInProject(projectId, id);

    const data: Prisma.DocumentUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.storagePath !== undefined && { storagePath: dto.storagePath }),
      ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
      ...(dto.uploadedAt !== undefined && { uploadedAt: new Date(dto.uploadedAt) }),
    };

    const [document, activity] = await this.prisma.$transaction([
      this.prisma.document.update({ where: { id }, data }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.DOCUMENT_UPDATED,
          entityType: ActivityEntityType.DOCUMENT,
          entityId: id,
          description: `Document "${dto.title ?? existing.title}" updated (${Object.keys(dto).join(', ')})`,
        },
      }),
    ]);

    return DocumentsMapper.toResponseDto(document, this.toActivitySummary(activity));
  }

  /**
   * Deletes the metadata row (extracted text goes with it via cascade; scope
   * requirements keep working — their source link is SET NULL) and logs the
   * deletion in one transaction. No bucket interaction: the storage object is
   * left untouched by design — cleanup belongs to the Supabase Storage phase.
   */
  async remove(projectId: string, id: string): Promise<Document> {
    const existing = await this.findDocumentInProject(projectId, id);

    await this.prisma.$transaction([
      this.prisma.document.delete({ where: { id } }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.DOCUMENT_DELETED,
          entityType: ActivityEntityType.DOCUMENT,
          entityId: existing.id,
          description: `Document "${existing.title}" removed from project`,
        },
      }),
    ]);

    return existing;
  }

  /**
   * Deterministic text extraction (Phase 13). The client supplies the
   * document's authorized text content (or reprocesses previously stored
   * text); the pipeline normalizes it, persists it 1:1 and flips the
   * lifecycle to COMPLETED — or to FAILED when nothing extractable remains.
   * No AI provider, no PDF/OCR parsing, no storage I/O.
   */
  async process(projectId: string, id: string, dto: ProcessDocumentDto): Promise<DocumentDetailDto> {
    const document = await this.findDocumentInProject(projectId, id);

    const raw =
      dto.textContent ??
      (
        await this.prisma.documentText.findUnique({
          where: { documentId: id },
          select: { content: true },
        })
      )?.content;

    if (raw === undefined) {
      throw new BadRequestException(
        'No text content to process: this deployment supports text documents only. ' +
          'Provide textContent in the request body — PDF/DOC/image (OCR) extraction is not implemented.',
      );
    }

    const content = normalizeExtractedText(raw);
    const processingError = content
      ? null
      : 'No extractable text content — the provided text is empty after normalization';

    await this.prisma.$transaction(async (tx) => {
      if (content) {
        await tx.documentText.upsert({
          where: { documentId: id },
          create: { documentId: id, content, charCount: content.length },
          update: { content, charCount: content.length },
        });
      }

      await tx.document.update({
        where: { id },
        data: {
          processingStatus: content
            ? DocumentProcessingStatus.COMPLETED
            : DocumentProcessingStatus.FAILED,
          processedAt: new Date(),
          processingError,
        },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: content
            ? ActivityAction.DOCUMENT_PROCESSED
            : ActivityAction.DOCUMENT_PROCESSING_FAILED,
          entityType: ActivityEntityType.DOCUMENT,
          entityId: id,
          description: content
            ? `Document "${document.title}" processed (${content.length} characters extracted)`
            : `Document "${document.title}" processing failed: ${processingError}`,
        },
      });
    });

    return this.findOne(projectId, id);
  }

  // ——— guards & helpers ———

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  /** Document must exist AND belong to the project. */
  private async findDocumentInProject(
    projectId: string,
    id: string,
    includeText = false,
  ): Promise<Document & { extractedText: DocumentText | null }> {
    const document = await this.prisma.document.findFirst({
      where: { id, projectId },
      ...(includeText && { include: { extractedText: true } }),
    });
    if (!document) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
    return document as Document & { extractedText: DocumentText | null };
  }

  private async latestActivityOf(
    projectId: string,
    documentId: string,
  ): Promise<ActivitySummaryDto | null> {
    const activity = await this.prisma.activity.findFirst({
      where: { projectId, entityType: ActivityEntityType.DOCUMENT, entityId: documentId },
      orderBy: { createdAt: 'desc' },
    });
    return activity ? this.toActivitySummary(activity) : null;
  }

  private toActivitySummary(activity: Activity): ActivitySummaryDto {
    return {
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
