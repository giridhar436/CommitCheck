import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';
import {
  RetrievalLinkedRequirementDto,
  RetrievalResultItemDto,
  RetrievalScopeResponseDto,
} from './dto/retrieval-response.dto';

/** Candidate caps — bounded reads, no whole-document loads. */
const MAX_CHUNK_CANDIDATES = 500;
const MAX_REQUIREMENT_CANDIDATES = 200;
const MAX_EMBED_BATCH = 64;

/** Small deterministic stopword list (lexical scoring quality only). */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'will', 'shall', 'from',
  'into', 'onto', 'over', 'under', 'a', 'an', 'to', 'of', 'in', 'on',
  'is', 'are', 'be', 'as', 'at', 'by', 'it', 'or', 'we', 'our',
]);

/** Lowercase word tokens, deduplicated, stopwords removed. */
export function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length >= 2 && !STOPWORDS.has(raw)) tokens.add(raw);
  }
  return tokens;
}

/** Deterministic cosine similarity for equal-length vectors; null when the
 *  dimensions don't match (mismatched vectors are skipped, never guessed). */
export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length === 0 || a.length !== b.length) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Phase 14 — project-scoped scope retrieval.
 *
 * SEMANTIC RETRIEVAL = CANDIDATE DISCOVERY. Results feed explainability and
 * human review; they never authorize anything. Authorization stays exactly
 * where it was: Phase 10's deterministic matcher + approved scope /
 * APPROVED change requests.
 *
 * Modes (always labeled in the response, never conflated):
 *  - 'vector' — a real embedding provider is configured AND the chunks carry
 *    stored embeddings: query embedding vs chunk embeddings, cosine in-process
 *    (brute force; pgvector is not used — see README).
 *  - 'lexical' — no provider/embeddings: deterministic term-coverage ranking
 *    over chunk texts and requirement content.
 *
 * Every query is filtered by projectId at the database level — another
 * project's chunks/requirements can never be returned.
 */
@Injectable()
export class RetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async retrieveRelevantScope(
    projectId: string,
    queryDto: RetrievalQueryDto,
  ): Promise<RetrievalScopeResponseDto> {
    await this.assertProjectExists(projectId);

    const limit = queryDto.limit ?? 5;
    const query = queryDto.query;

    const chunks = await this.prisma.documentChunk.findMany({
      where: { document: { projectId } },
      select: {
        id: true,
        documentId: true,
        chunkIndex: true,
        charStart: true,
        charEnd: true,
        text: true,
        embedding: true,
        embeddingStatus: true,
        document: { select: { title: true, type: true } },
      },
      orderBy: [{ documentId: 'asc' }, { chunkIndex: 'asc' }],
      take: MAX_CHUNK_CANDIDATES,
    });

    const requirements = await this.prisma.scopeRequirement.findMany({
      where: { projectId },
      select: { id: true, title: true, description: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_REQUIREMENT_CANDIDATES,
    });

    // Requirements traced to the retrieved documents (batched, then grouped).
    const docIds = [...new Set(chunks.map((c) => c.documentId))];
    const links = docIds.length
      ? await this.prisma.scopeRequirement.findMany({
          where: { projectId, sourceDocumentId: { in: docIds } },
          select: {
            id: true,
            title: true,
            category: true,
            approvalStatus: true,
            sourceDocumentId: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const linksByDocument = new Map<string, RetrievalLinkedRequirementDto[]>();
    for (const link of links) {
      if (!link.sourceDocumentId) continue;
      const list = linksByDocument.get(link.sourceDocumentId) ?? [];
      list.push({
        id: link.id,
        title: link.title,
        category: link.category,
        approvalStatus: link.approvalStatus,
      });
      linksByDocument.set(link.sourceDocumentId, list);
    }

    const results: RetrievalResultItemDto[] = [];

    const hasStoredEmbeddings = chunks.some(
      (c) => c.embeddingStatus === 'COMPLETED' && c.embedding !== null,
    );
    const vectorMode = this.embeddings.active && hasStoredEmbeddings;

    if (vectorMode) {
      const [queryVector] = await this.embeddings.embed([query]);
      for (const chunk of chunks) {
        if (chunk.embeddingStatus !== 'COMPLETED' || chunk.embedding === null) continue;
        const stored = toNumberArray(chunk.embedding);
        if (!stored) continue;
        const score = cosineSimilarity(queryVector, stored);
        if (score === null || score <= 0) continue;
        results.push(this.chunkItem(chunk, score, 'cosine', linksByDocument.get(chunk.documentId) ?? []));
      }
    } else {
      // Deterministic lexical fallback — clearly labeled, never "vector".
      const queryTokens = tokenize(query);
      for (const chunk of chunks) {
        const score = lexicalScore(queryTokens, chunk.text);
        if (score > 0) results.push(this.chunkItem(chunk, score, 'lexical', linksByDocument.get(chunk.documentId) ?? []));
      }
    }

    // Requirements are the primary baseline — always lexical candidates.
    // (Requirement embeddings are not stored in this phase; see README.)
    const queryTokens = tokenize(query);
    for (const requirement of requirements) {
      const haystack = `${requirement.title} ${requirement.description ?? ''}`;
      const score = lexicalScore(queryTokens, haystack);
      if (score > 0) {
        results.push({
          sourceType: 'SCOPE_REQUIREMENT',
          sourceId: requirement.id,
          documentId: null,
          documentTitle: null,
          requirementId: requirement.id,
          requirementTitle: requirement.title,
          text: haystack.trim(),
          score,
          similarityKind: 'lexical',
          metadata: {
            documentType: null,
            chunkIndex: null,
            charStart: null,
            charEnd: null,
          },
          linkedRequirements: [],
        });
      }
    }

    results.sort(
      (a, b) =>
        b.score - a.score ||
        a.sourceType.localeCompare(b.sourceType) ||
        a.sourceId.localeCompare(b.sourceId),
    );

    return {
      mode: vectorMode ? 'vector' : 'lexical',
      provider: this.embeddings.status,
      query,
      results: results.slice(0, limit),
    };
  }

  private chunkItem(
    chunk: {
      id: string;
      documentId: string;
      chunkIndex: number;
      charStart: number;
      charEnd: number;
      text: string;
      document: { title: string; type: string };
    },
    score: number,
    similarityKind: 'cosine' | 'lexical',
    linkedRequirements: RetrievalLinkedRequirementDto[] = [],
  ): RetrievalResultItemDto {
    return {
      sourceType: 'DOCUMENT_CHUNK',
      sourceId: chunk.id,
      documentId: chunk.documentId,
      documentTitle: chunk.document.title,
      requirementId: null,
      requirementTitle: null,
      text: chunk.text,
      score,
      similarityKind,
      metadata: {
        documentType: chunk.document.type,
        chunkIndex: chunk.chunkIndex,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
      },
      linkedRequirements,
    };
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
}

/** Deterministic lexical relevance: share of distinct query terms present. */
function lexicalScore(queryTokens: Set<string>, text: string): number {
  if (queryTokens.size === 0) return 0;
  const textTokens = tokenize(text);
  let matches = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) matches++;
  }
  return matches / queryTokens.size;
}

function toNumberArray(value: Prisma.JsonValue): number[] | null {
  if (!Array.isArray(value)) return null;
  const out: number[] = [];
  for (const v of value) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    out.push(v);
  }
  return out;
}
