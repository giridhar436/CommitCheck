import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  ApprovalStatus,
  Priority,
  Prisma,
  ProjectRole,
  ScopeRequirement,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScopeRequirementDto } from './dto/create-scope-requirement.dto';
import { GetScopeRequirementsQueryDto } from './dto/get-scope-requirements-query.dto';
import { UpdateScopeRequirementDto } from './dto/update-scope-requirement.dto';
import { ScopeRequirementResponseDto } from './dto/scope-requirement-response.dto';
import { Paginated } from '../common/api-response';
import { ScopeRequirementsMapper } from './scope-requirements.mapper';

/**
 * Field-level RBAC (Phase 15): a requirement's approvalStatus is an
 * authorization decision — marking scope as APPROVED is what later lets
 * verification report a commitment as authorized. Creating or changing
 * that field therefore requires an ADMIN/OWNER; ordinary MEMBER writes
 * cannot mint authorization. Fails closed when the role is unknown.
 */
function assertApprovalAllowed(
  role: ProjectRole | undefined,
  action: string,
): void {
  if (role === ProjectRole.ADMIN || role === ProjectRole.OWNER) return;
  throw new ForbiddenException(
    `Project access denied: changing a scope requirement's approvalStatus (via ${action}) requires an admin role`,
  );
}

@Injectable()
export class ScopeRequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated list for one project: search + category/priority/approval filters. */
  async findAll(
    projectId: string,
    query: GetScopeRequirementsQueryDto,
  ): Promise<Paginated<ScopeRequirementResponseDto>> {
    await this.assertProjectExists(projectId);

    const { page, limit, search, category, priority, approvalStatus, sortBy, sortOrder, skip } =
      query;

    const where: Prisma.ScopeRequirementWhereInput = {
      projectId,
      ...(priority ? { priority } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(category
        ? { category: { equals: category.trim(), mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [requirements, totalItems] = await this.prisma.$transaction([
      this.prisma.scopeRequirement.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: { sourceDocument: { select: { id: true, title: true, type: true } } },
      }),
      this.prisma.scopeRequirement.count({ where }),
    ]);

    return {
      items: requirements.map(ScopeRequirementsMapper.toResponseDto),
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  /** Full requirement; 404 unless it exists AND belongs to the project. */
  async findOne(projectId: string, id: string): Promise<ScopeRequirementResponseDto> {
    const requirement = await this.prisma.scopeRequirement.findFirst({
      where: { id, projectId },
      include: { sourceDocument: { select: { id: true, title: true, type: true } } },
    });
    if (!requirement) {
      throw new NotFoundException(`Scope requirement with id ${id} not found`);
    }
    return ScopeRequirementsMapper.toResponseDto(requirement);
  }

  /** Creates the requirement and its audit entry in one transaction. */
  async create(
    projectId: string,
    dto: CreateScopeRequirementDto,
    callerRole?: ProjectRole,
  ): Promise<ScopeRequirementResponseDto> {
    await this.assertProjectExists(projectId);
    if (dto.approvalStatus !== undefined && dto.approvalStatus !== ApprovalStatus.PENDING) {
      assertApprovalAllowed(callerRole, 'requirement creation');
    }
    await this.assertTitleAvailable(projectId, dto.title);
    if (dto.sourceDocumentId) {
      await this.assertSourceDocumentInProject(projectId, dto.sourceDocumentId);
    }

    const requirement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.scopeRequirement.create({
        data: {
          projectId,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          priority: dto.priority ?? Priority.MEDIUM,
          approvalStatus: dto.approvalStatus ?? ApprovalStatus.PENDING,
          sourceClause: dto.sourceClause,
          acceptanceCriteria: dto.acceptanceCriteria,
          ...(dto.sourceDocumentId && { sourceDocumentId: dto.sourceDocumentId }),
        },
        include: { sourceDocument: { select: { id: true, title: true, type: true } } },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.SCOPE_REQUIREMENT_CREATED,
          entityType: ActivityEntityType.SCOPE_REQUIREMENT,
          entityId: created.id,
          description: `Scope requirement "${created.title}" added to approved scope`,
        },
      });

      return created;
    });

    return ScopeRequirementsMapper.toResponseDto(requirement);
  }

  /** Partial update; duplicate-title rule is checked across the merged record. */
  async update(
    projectId: string,
    id: string,
    dto: UpdateScopeRequirementDto,
    callerRole?: ProjectRole,
  ): Promise<ScopeRequirementResponseDto> {
    const existing = await this.prisma.scopeRequirement.findFirst({
      where: { id, projectId },
      select: { id: true, title: true, approvalStatus: true },
    });
    if (!existing) {
      throw new NotFoundException(`Scope requirement with id ${id} not found`);
    }
    if (
      dto.approvalStatus !== undefined &&
      dto.approvalStatus !== existing.approvalStatus
    ) {
      assertApprovalAllowed(callerRole, 'requirement update');
    }

    if (dto.title !== undefined && dto.title !== existing.title) {
      await this.assertTitleAvailable(projectId, dto.title, id);
    }
    if (dto.sourceDocumentId !== undefined) {
      await this.assertSourceDocumentInProject(projectId, dto.sourceDocumentId);
    }

    const data: Prisma.ScopeRequirementUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.approvalStatus !== undefined && { approvalStatus: dto.approvalStatus }),
      ...(dto.sourceClause !== undefined && { sourceClause: dto.sourceClause }),
      ...(dto.acceptanceCriteria !== undefined && {
        acceptanceCriteria: dto.acceptanceCriteria,
      }),
      ...(dto.sourceDocumentId !== undefined && { sourceDocumentId: dto.sourceDocumentId }),
    };

    const [requirement] = await this.prisma.$transaction([
      this.prisma.scopeRequirement.update({
        where: { id },
        data,
        include: { sourceDocument: { select: { id: true, title: true, type: true } } },
      }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.SCOPE_REQUIREMENT_UPDATED,
          entityType: ActivityEntityType.SCOPE_REQUIREMENT,
          entityId: id,
          description: `Scope requirement "${dto.title ?? existing.title}" updated (${Object.keys(dto).join(', ')})`,
        },
      }),
    ]);

    return ScopeRequirementsMapper.toResponseDto(requirement);
  }

  /**
   * Deletes the requirement and logs its deletion in one transaction. Unlike
   * project deletion, this activity survives: it points at the (still
   * existing) project via projectId, and entityId is polymorphic by design.
   */
  async remove(projectId: string, id: string): Promise<{ id: string; title: string }> {
    const existing = await this.prisma.scopeRequirement.findFirst({
      where: { id, projectId },
      select: { id: true, title: true },
    });
    if (!existing) {
      throw new NotFoundException(`Scope requirement with id ${id} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.scopeRequirement.delete({ where: { id } }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.SCOPE_REQUIREMENT_DELETED,
          entityType: ActivityEntityType.SCOPE_REQUIREMENT,
          entityId: existing.id,
          description: `Scope requirement "${existing.title}" removed from approved scope`,
        },
      }),
    ]);

    return existing;
  }

  // ——— business rules ———

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  /** Same title within the same project is a duplicate (case-insensitive). */
  private async assertTitleAvailable(
    projectId: string,
    title: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.scopeRequirement.findFirst({
      where: {
        projectId,
        title: { equals: title.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `A requirement titled "${title}" already exists in this project`,
      );
    }
  }

  /**
   * Phase 13 traceability guard: the source document must exist AND belong to
   * the same project. A cross-project document id is indistinguishable from a
   * nonexistent one (400, no information leak).
   */
  private async assertSourceDocumentInProject(
    projectId: string,
    documentId: string,
  ): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, projectId },
      select: { id: true },
    });
    if (!document) {
      throw new BadRequestException(
        `sourceDocumentId ${documentId} does not reference a document in this project`,
      );
    }
  }
}
