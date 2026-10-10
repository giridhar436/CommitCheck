import { Prisma } from '@prisma/client';
import { ProjectResponseDto, ActivitySummaryDto } from './dto/project-response.dto';

type ProjectWithCounts = Prisma.ProjectGetPayload<{
  include: {
    _count: { select: { scopeRequirements: true; meetings: true; commitments: true; changeRequests: true; documents: true } };
    activities: { take: 1; orderBy: { createdAt: 'desc' } };
  };
}>;

/**
 * Maps Prisma rows to the API's JSON contract:
 * dates → ISO strings, Decimal budget → number, relations → counts.
 */
export class ProjectsMapper {
  static toActivitySummary(activity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    description: string;
    createdAt: Date;
  }): ActivitySummaryDto {
    return {
      id: activity.id,
      action: activity.action as ActivitySummaryDto['action'],
      entityType: activity.entityType as ActivitySummaryDto['entityType'],
      entityId: activity.entityId,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    };
  }

  static toResponseDto(project: ProjectWithCounts): ProjectResponseDto {
    return {
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      description: project.description,
      status: project.status,
      budget: project.budget ? project.budget.toNumber() : null,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      counts: {
        scopeRequirements: project._count.scopeRequirements,
        meetings: project._count.meetings,
        commitments: project._count.commitments,
        changeRequests: project._count.changeRequests,
        documents: project._count.documents,
      },
      latestActivity: project.activities[0]
        ? ProjectsMapper.toActivitySummary(project.activities[0])
        : null,
    };
  }
}
