import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { ProcessDocumentDto } from './dto/process-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import {
  DocumentDetailDto,
  DocumentResponseDto,
  DocumentSourceRequirementDto,
} from './dto/document-response.dto';
import { DocumentsMapper, ChunkStats } from './documents.mapper';
import { Paginated } from '../common/api-response';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';
import { DocumentStorageService, assertStoragePathSafe } from './document-storage.service';
import {
  UnsupportedDocumentFormatError,
  extractTextFromBinary,
} from './text-extraction';
import { buildChunks } from './chunker';
import type { ChunkPlan } from './chunker';

/** Hard cap for client-supplied decoded document bytes (10 MB). */
const MAX_BINARY_BYTES = 10 * 1024 * 1024;
/** Phase 15 hardening: a document yielding more chunks than this fails
 * processing honestly (deterministic limit, keeps extraction+insertion
 * bounded so a pathological input can never wedge the worker). */
const MAX_CHUNKS = 2000;
/** Phase 15 hardening: extraction (CPU-bound parsing of possibly hostile
 * bytes) is bounded; an over-long run becomes a FAILED state instead of an
 * indefinitely hung request. */
const EXTRACTION_TIMEOUT_MS = 60_000;

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
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    private readonly storage: DocumentStorageService,
  ) {}

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

    // Batched chunk/index counts for the page (two groupBys — no N+1).
    const chunkStats = await this.chunkStatsFor(docIds);

    return {
      items: documents.map((document) =>
        DocumentsMapper.toResponseDto(
          document,
          latestByDocument.get(document.id) ?? null,
          chunkStats.get(document.id) ?? { chunkCount: 0, indexedChunks: 0 },
        ),
      ),
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    };
  }

  /** Detail: adds the extracted text (processing result), the scope
   *  requirements traced back to this document, and chunk/index counts. */
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

    const [chunkCount, indexedChunks] = await this.prisma.$transaction([
      this.prisma.documentChunk.count({ where: { documentId: id } }),
      this.prisma.documentChunk.count({
        where: { documentId: id, embeddingStatus: 'COMPLETED' },
      }),
    ]);

    return DocumentsMapper.toDetailDto(
      document,
      sourceRequirements.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      await this.latestActivityOf(projectId, id),
      { chunkCount, indexedChunks },
    );
  }

  /** Creates the metadata row (the binary lives in Supabase Storage, uploaded
   *  out of band) + DOCUMENT_UPLOADED audit entry. */
  async create(projectId: string, dto: CreateDocumentDto): Promise<DocumentResponseDto> {
    await this.assertProjectExists(projectId);
    this.assertSafeStoragePath(dto.storagePath);

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

    return DocumentsMapper.toResponseDto(
      document.created,
      this.toActivitySummary(document.activity),
      { chunkCount: 0, indexedChunks: 0 },
    );
  }

  /** Partial update of editable metadata fields + DOCUMENT_UPDATED audit entry. */
  async update(
    projectId: string,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const existing = await this.findDocumentInProject(projectId, id);
    if (dto.storagePath !== undefined) {
      this.assertSafeStoragePath(dto.storagePath);
    }

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

    return DocumentsMapper.toResponseDto(
      document,
      this.toActivitySummary(activity),
      await this.chunkStatsFor([id]).then((m) => m.get(id) ?? { chunkCount: 0, indexedChunks: 0 }),
    );
  }

  /**
   * Deletes the metadata row (extracted text and chunks go with it via
   * cascade; scope requirements keep working — their source link is SET NULL)
   * and logs the deletion in one transaction. No bucket interaction: the
   * storage object is left untouched by design — cleanup belongs to the
   * Supabase Storage phase.
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
   * Deterministic processing pipeline (Phases 13 + 14).
   *
   * 1. Resolve the authoritative content, in strict order:
   *      request textContent → request binaryContent (base64; parsed with
   *      real PDF/DOCX extractors) → configured storage download →
   *      previously stored DocumentText (Phase 13 idempotent reprocessing).
   * 2. Normalize the text (pure function — same input, same output).
   * 3. Persist DocumentText, rebuild the chunk set (full delete + recreate
   *    in one transaction, keyed by (documentId, chunkIndex) — retries never
   *    duplicate) carrying over embeddings for unchanged chunk hashes, and
   *    flip the lifecycle to COMPLETED — or FAILED when nothing extractable
   *    remains / the format is unsupported. Unsupported formats and OCR are
   *    honestly failed, never faked as COMPLETED.
   * 4. If an embedding provider is configured, index the new chunks
   *    (best-effort — failures leave chunks FAILED and never alter the
   *    document's extraction outcome or authorization semantics).
   */
  async process(projectId: string, id: string, dto: ProcessDocumentDto): Promise<DocumentDetailDto> {
    const document = await this.findDocumentInProject(projectId, id);

    if (dto.textContent !== undefined && dto.binaryContent !== undefined) {
      throw new BadRequestException(
        'Provide either textContent or binaryContent — not both in the same request.',
      );
    }

    let raw: string | undefined;
    let formatNote = 'TEXT';

    // Request-level validation — invalid base64 stays a 400, it never becomes
    // a document processing state.
    const binaryBytes =
      dto.binaryContent !== undefined ? this.decodeBase64(dto.binaryContent) : null;

    try {
      if (dto.textContent !== undefined) {
        raw = dto.textContent;
      } else if (binaryBytes) {
        const extracted = await this.extractWithTimeout(binaryBytes);
        raw = extracted.text;
        formatNote = extracted.format;
      } else if (this.storage.configured) {
        const bytes = await this.storage.fetchDocumentBytes(document);
        const extracted = await this.extractWithTimeout(bytes);
        raw = extracted.text;
        formatNote = extracted.format;
      } else {
        const stored = await this.prisma.documentText.findUnique({
          where: { documentId: id },
          select: { content: true },
        });
        if (stored) {
          raw = stored.content;
        }
      }
    } catch (error) {
      // Honest failure: unsupported formats and extraction errors become a
      // real FAILED state — never a fabricated COMPLETED.
      return this.failProcessing(
        projectId,
        document,
        error instanceof UnsupportedDocumentFormatError
          ? error.message
          : `Text extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    if (raw === undefined) {
      throw new BadRequestException(
        'Nothing to process: provide textContent (text documents) or binaryContent ' +
          '(base64 of a PDF/DOCX/text file). Server-side storage download requires ' +
          'SUPABASE_STORAGE_URL, SUPABASE_STORAGE_BUCKET and SUPABASE_STORAGE_SERVICE_KEY. ' +
          'Image/OCR extraction is not implemented.',
      );
    }

    const content = normalizeExtractedText(raw);
    const chunkPlans = content ? buildChunks(content) : [];
    const processingError = !content
      ? 'No extractable text content — the provided text is empty after normalization'
      : chunkPlans.length > MAX_CHUNKS
        ? `Document yields ${chunkPlans.length} chunks — above the ${MAX_CHUNKS}-chunk processing limit`
        : null;

    await this.prisma.$transaction(async (tx) => {
      if (content && !processingError) {
        await tx.documentText.upsert({
          where: { documentId: id },
          create: { documentId: id, content, charCount: content.length },
          update: { content, charCount: content.length },
        });
        await this.rebuildChunks(tx, id, chunkPlans);
      } else {
        // A failed run leaves no derived data behind.
        await tx.documentText.deleteMany({ where: { documentId: id } });
        await tx.documentChunk.deleteMany({ where: { documentId: id } });
      }

      await tx.document.update({
        where: { id },
        data: {
          processingStatus: processingError
            ? DocumentProcessingStatus.FAILED
            : DocumentProcessingStatus.COMPLETED,
          processedAt: new Date(),
          processingError,
        },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: processingError
            ? ActivityAction.DOCUMENT_PROCESSING_FAILED
            : ActivityAction.DOCUMENT_PROCESSED,
          entityType: ActivityEntityType.DOCUMENT,
          entityId: id,
          description: processingError
            ? `Document "${document.title}" processing failed: ${processingError}`
            : `Document "${document.title}" processed (${content!.length} characters extracted from ${formatNote})`,
        },
      });
    });

    // Best-effort semantic indexing — never affects the extraction outcome.
    if (content && !processingError && this.embeddings.active) {
      await this.indexChunks(id, document.title);
    }

    return this.findOne(projectId, id);
  }

  // ——— guards & helpers ———

  /** Bounded extraction: an over-long CPU-bound parse surfaces as an
   * extraction failure (FAILED state) instead of hanging the request. */
  private extractWithTimeout(
    bytes: Buffer,
  ): Promise<{ text: string; format: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`text extraction exceeded ${EXTRACTION_TIMEOUT_MS / 1000}s — the file may be malformed or pathological`)),
        EXTRACTION_TIMEOUT_MS,
      );
      extractTextFromBinary(bytes).then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private assertSafeStoragePath(storagePath: string): void {
    try {
      assertStoragePathSafe(storagePath);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid storagePath',
      );
    }
  }

  private decodeBase64(binaryContent: string): Buffer {
    const bytes = Buffer.from(binaryContent, 'base64');
    if (bytes.length === 0) {
      throw new BadRequestException('binaryContent is empty or not valid base64');
    }
    if (bytes.length > MAX_BINARY_BYTES) {
      throw new BadRequestException('binaryContent exceeds the 10 MB decoded-size limit');
    }
    // base64 with the strict alphabet round-trips; catch silent coercion of
    // arbitrary strings by re-encoding.
    if (bytes.toString('base64').replace(/=+$/, '') !== binaryContent.replace(/=+$/, '').replace(/\s/g, '')) {
      throw new BadRequestException('binaryContent is not valid base64');
    }
    return bytes;
  }

  /**
   * Marks processing FAILED (honest failure state) with an audit entry and
   * returns the document detail — mirrors the Phase 13 empty-content path.
   */
  private async failProcessing(
    projectId: string,
    document: Document,
    processingError: string,
  ): Promise<DocumentDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      await tx.documentText.deleteMany({ where: { documentId: document.id } });
      await tx.documentChunk.deleteMany({ where: { documentId: document.id } });
      await tx.document.update({
        where: { id: document.id },
        data: {
          processingStatus: DocumentProcessingStatus.FAILED,
          processedAt: new Date(),
          processingError,
        },
      });
      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.DOCUMENT_PROCESSING_FAILED,
          entityType: ActivityEntityType.DOCUMENT,
          entityId: document.id,
          description: `Document "${document.title}" processing failed: ${processingError}`,
        },
      });
    });
    return this.findOne(projectId, document.id);
  }

  /**
   * Replaces the document's chunk set inside the caller's transaction.
   * Chunks whose content hash already existed keep their stored embedding
   * (no provider calls for unchanged content). Unique (documentId,
   * chunkIndex) plus the full delete make retries duplicate-free.
   */
  private async rebuildChunks(
    tx: Prisma.TransactionClient,
    documentId: string,
    plans: ChunkPlan[],
  ): Promise<void> {
    const previous = await tx.documentChunk.findMany({
      where: { documentId },
      select: { contentHash: true, embedding: true, embeddingModel: true, embeddingStatus: true },
    });
    const embeddingByHash = new Map(
      previous
        .filter((c) => c.embeddingStatus === 'COMPLETED' && c.embedding !== null)
        .map((c) => [c.contentHash, c]),
    );

    await tx.documentChunk.deleteMany({ where: { documentId } });
    if (plans.length === 0) return;

    await tx.documentChunk.createMany({
      data: plans.map((plan) => {
        const reused = embeddingByHash.get(plan.contentHash);
        return {
          documentId,
          chunkIndex: plan.chunkIndex,
          text: plan.text,
          charStart: plan.charStart,
          charEnd: plan.charEnd,
          contentHash: plan.contentHash,
          embeddingStatus: reused ? ('COMPLETED' as const) : ('SKIPPED' as const),
          ...(reused
            ? {
                embedding: reused.embedding as Prisma.InputJsonValue,
                embeddingModel: reused.embeddingModel,
              }
            : {}),
        };
      }),
    });
  }

  /**
   * Embeds the document's unindexed chunks and stores the vectors
   * (best-effort). Content-hash reuse in rebuildChunks means unchanged
   * chunks never trigger provider calls.
   */
  private async indexChunks(documentId: string, title: string): Promise<void> {
    const pending = await this.prisma.documentChunk.findMany({
      where: { documentId, embeddingStatus: { not: 'COMPLETED' } },
      select: { id: true, text: true },
      orderBy: { chunkIndex: 'asc' },
    });
    if (pending.length === 0) return;

    const vectors = await this.embeddings.embedQuietly(pending.map((c) => c.text));
    if (vectors === null) {
      // Provider failed — mark the attempted chunks FAILED so the UI shows
      // an honest index status; a later reprocess retries them.
      await this.prisma.documentChunk.updateMany({
        where: { documentId, id: { in: pending.map((c) => c.id) } },
        data: { embeddingStatus: 'FAILED' },
      });
      return;
    }

    await this.prisma.$transaction(
      pending.map((chunk, i) =>
        this.prisma.documentChunk.update({
          where: { id: chunk.id },
          data: {
            embedding: vectors[i] as Prisma.InputJsonValue,
            embeddingModel: this.embeddings.model,
            embeddingStatus: 'COMPLETED',
          },
        }),
      ),
    );
    this.logger.log(`Indexed ${pending.length} chunks of document "${title}"`);
  }

  /** Batched (documentId → chunk/index counts) for list pages. */
  private async chunkStatsFor(documentIds: string[]): Promise<Map<string, ChunkStats>> {
    const stats = new Map<string, ChunkStats>(
      documentIds.map((id) => [id, { chunkCount: 0, indexedChunks: 0 }]),
    );
    if (documentIds.length === 0) return stats;

    const groupWhere = (where: Prisma.DocumentChunkWhereInput) =>
      this.prisma.documentChunk.groupBy({
        by: ['documentId'],
        where,
        _count: { _all: true },
      });

    const [totals, indexed] = await Promise.all([
      groupWhere({ documentId: { in: documentIds } }),
      groupWhere({ documentId: { in: documentIds }, embeddingStatus: 'COMPLETED' }),
    ]);
    const countOf = (row: { _count: { _all: number } | null }): number =>
      row._count?._all ?? 0;
    for (const row of totals) {
      const entry = stats.get(row.documentId) ?? { chunkCount: 0, indexedChunks: 0 };
      entry.chunkCount = countOf(row);
      stats.set(row.documentId, entry);
    }
    for (const row of indexed) {
      const entry = stats.get(row.documentId) ?? { chunkCount: 0, indexedChunks: 0 };
      entry.indexedChunks = countOf(row);
      stats.set(row.documentId, entry);
    }
    return stats;
  }

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
