import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  CommitmentEvidence,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommitmentEvidenceDto } from './dto/create-commitment-evidence.dto';
import { GetCommitmentEvidenceQueryDto } from './dto/get-commitment-evidence-query.dto';
import { CommitmentEvidenceResponseDto } from './dto/commitment-evidence-response.dto';
import { Paginated } from '../common/api-response';
import { CommitmentEvidenceMapper } from './commitment-evidence.mapper';

@Injectable()
export class CommitmentEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated list for one commitment: quote-only search + timestamp/createdAt sorting. */
  async findAll(
    projectId: string,
    commitmentId: string,
    query: GetCommitmentEvidenceQueryDto,
  ): Promise<Paginated<CommitmentEvidenceResponseDto>> {
    await this.assertProjectExists(projectId);
    await this.assertCommitmentInProject(projectId, commitmentId);

    const { page, limit, search, sortBy, sortOrder, skip } = query;

    const where: Prisma.CommitmentEvidenceWhereInput = {
      commitmentId,
      ...(search ? { quote: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [evidence, totalItems] = await this.prisma.$transaction([
      this.prisma.commitmentEvidence.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.commitmentEvidence.count({ where }),
    ]);

    return {
      items: evidence.map((row) => CommitmentEvidenceMapper.toResponseDto(row)),
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  /** Full detail of one immutable evidence row. */
  async findOne(
    projectId: string,
    commitmentId: string,
    id: string,
  ): Promise<CommitmentEvidenceResponseDto> {
    // Phase 13 security fix: validate the project/commitment chain exactly
    // like findAll/create do — the detail route previously skipped both
    // guards, letting any projectId read any commitment's evidence.
    await this.assertProjectExists(projectId);
    await this.assertCommitmentInProject(projectId, commitmentId);
    const evidence = await this.findEvidenceInCommitment(commitmentId, id);
    return CommitmentEvidenceMapper.toResponseDto(evidence);
  }

  /** Creates the evidence row + audit entry in one transaction. */
  async create(
    projectId: string,
    commitmentId: string,
    dto: CreateCommitmentEvidenceDto,
  ): Promise<CommitmentEvidenceResponseDto> {
    await this.assertProjectExists(projectId);
    const commitment = await this.assertCommitmentInProject(projectId, commitmentId);

    const evidence = await this.prisma.$transaction(async (tx) => {
      const created = await tx.commitmentEvidence.create({
        data: {
          commitmentId,
          quote: dto.quote,
          ...(dto.timestamp !== undefined && { timestamp: new Date(dto.timestamp) }),
          source: dto.source,
        },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.EVIDENCE_ADDED,
          entityType: ActivityEntityType.COMMITMENT,
          entityId: commitmentId,
          description: `Evidence (${created.source}) added to commitment "${commitment.title}"`,
        },
      });

      return created;
    });

    return CommitmentEvidenceMapper.toResponseDto(evidence);
  }

  /**
   * Deletes the evidence row and logs the deletion in one transaction.
   * Evidence is immutable: there is no PATCH — fix incorrect quotes by
   * deleting and recreating. The audit entry points at the commitment,
   * so it survives the row's removal.
   */
  async remove(
    projectId: string,
    commitmentId: string,
    id: string,
  ): Promise<CommitmentEvidence> {
    await this.assertProjectExists(projectId);
    const commitment = await this.assertCommitmentInProject(projectId, commitmentId);
    const existing = await this.findEvidenceInCommitment(commitmentId, id);

    await this.prisma.$transaction([
      this.prisma.commitmentEvidence.delete({ where: { id } }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.EVIDENCE_DELETED,
          entityType: ActivityEntityType.COMMITMENT,
          entityId: commitmentId,
          description: `Evidence (${existing.source}) removed from commitment "${commitment.title}"`,
        },
      }),
    ]);

    return existing;
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

  /** One lookup covers both "commitment exists" and "commitment belongs to project". */
  private async assertCommitmentInProject(
    projectId: string,
    commitmentId: string,
  ): Promise<{ id: string; title: string }> {
    const commitment = await this.prisma.commitment.findFirst({
      where: { id: commitmentId, projectId },
      select: { id: true, title: true },
    });
    if (!commitment) {
      throw new NotFoundException(`Commitment with id ${commitmentId} not found`);
    }
    return commitment;
  }

  /** Evidence must exist AND belong to the (already validated) commitment. */
  private async findEvidenceInCommitment(
    commitmentId: string,
    id: string,
  ): Promise<CommitmentEvidence> {
    const evidence = await this.prisma.commitmentEvidence.findFirst({
      where: { id, commitmentId },
    });
    if (!evidence) {
      throw new NotFoundException(`Evidence with id ${id} not found`);
    }
    return evidence;
  }
}
