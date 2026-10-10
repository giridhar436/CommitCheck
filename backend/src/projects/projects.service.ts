import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityAction, ActivityEntityType, Prisma, Project, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { Paginated } from '../common/api-response';
import { ProjectsMapper } from './projects.mapper';

const PROJECT_LIST_INCLUDE = {
  _count: {
    select: {
      scopeRequirements: true,
      meetings: true,
      commitments: true,
      changeRequests: true,
      documents: true,
    },
  },
  activities: { take: 1, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated list with case-insensitive search, status filter and sorting. */
  async findAll(query: GetProjectsQueryDto): Promise<Paginated<ProjectResponseDto>> {
    const { page, limit, search, status, sortBy, sortOrder, skip } = query;

    const where: Prisma.ProjectWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { clientName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProjectOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [projects, totalItems] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: PROJECT_LIST_INCLUDE,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: projects.map(ProjectsMapper.toResponseDto),
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  /** Single project with relationship counts and the latest activity entry. */
  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: PROJECT_LIST_INCLUDE,
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
    return ProjectsMapper.toResponseDto(project);
  }

  /** Creates the project and its PROJECT_CREATED activity in one transaction. */
  async create(dto: CreateProjectDto): Promise<ProjectResponseDto> {
    this.validateDateOrder(
      dto.startDate ? new Date(dto.startDate) : null,
      dto.endDate ? new Date(dto.endDate) : null,
    );
    await this.assertNameAvailable(dto.name, dto.clientName);

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: dto.name,
          clientName: dto.clientName,
          description: dto.description,
          budget: dto.budget,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          status: dto.status ?? ProjectStatus.ACTIVE,
        },
        include: PROJECT_LIST_INCLUDE,
      });

      await tx.activity.create({
        data: {
          projectId: created.id,
          action: ActivityAction.PROJECT_CREATED,
          entityType: ActivityEntityType.PROJECT,
          entityId: created.id,
          description: `Project "${created.name}" created for ${created.clientName}`,
        },
      });

      return created;
    });

    return ProjectsMapper.toResponseDto(project);
  }

  /** Partial update; date-order and uniqueness are checked across the merged record. */
  async update(id: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, clientName: true, startDate: true, endDate: true },
    });
    if (!existing) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    const mergedStartDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const mergedEndDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    this.validateDateOrder(mergedStartDate, mergedEndDate);

    if (dto.name !== undefined || dto.clientName !== undefined) {
      const name = dto.name ?? existing.name;
      const clientName = dto.clientName ?? existing.clientName;
      await this.assertNameAvailable(name, clientName, id);
    }

    const data: Prisma.ProjectUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.clientName !== undefined && { clientName: dto.clientName }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    // Prisma bumps updatedAt automatically (schema-level @updatedAt).
    const [project] = await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id },
        data,
        include: PROJECT_LIST_INCLUDE,
      }),
      this.prisma.activity.create({
        data: {
          projectId: id,
          action: ActivityAction.PROJECT_UPDATED,
          entityType: ActivityEntityType.PROJECT,
          entityId: id,
          description: `Project "${dto.name ?? existing.name}" updated (${Object.keys(dto).join(', ')})`,
        },
      }),
    ]);

    return ProjectsMapper.toResponseDto(project);
  }

  /**
   * Deletes the project; the schema's ON DELETE CASCADE removes its entire
   * graph (scope, meetings, commitments, change requests, documents and the
   * activity trail). A PROJECT_DELETED activity therefore cannot outlive the
   * row it points at — flagged as a Phase 3 candidate for soft delete.
   */
  async remove(id: string): Promise<{ id: string; name: string; clientName: string }> {
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, clientName: true },
    });
    if (!existing) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }
    await this.prisma.project.delete({ where: { id } });
    return existing;
  }

  // ——— business rules ———

  private validateDateOrder(start?: Date | null, end?: Date | null): void {
    if (start && end && start.getTime() > end.getTime()) {
      throw new BadRequestException('Start date cannot be after end date');
    }
  }

  /** Same name for the same client is treated as a duplicate (409). */
  private async assertNameAvailable(
    name: string,
    clientName: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.project.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        clientName: { equals: clientName.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `A project named "${name}" already exists for client "${clientName}"`,
      );
    }
  }
}
