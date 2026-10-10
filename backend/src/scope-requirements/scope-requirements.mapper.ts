import { ScopeRequirement } from '@prisma/client';
import { ScopeRequirementResponseDto } from './dto/scope-requirement-response.dto';

/** Maps a Prisma row to the API's JSON contract (dates → ISO strings). */
export class ScopeRequirementsMapper {
  static toResponseDto(requirement: ScopeRequirement): ScopeRequirementResponseDto {
    return {
      id: requirement.id,
      projectId: requirement.projectId,
      title: requirement.title,
      description: requirement.description,
      category: requirement.category,
      priority: requirement.priority,
      approvalStatus: requirement.approvalStatus,
      sourceClause: requirement.sourceClause,
      acceptanceCriteria: requirement.acceptanceCriteria,
      createdAt: requirement.createdAt.toISOString(),
      updatedAt: requirement.updatedAt.toISOString(),
    };
  }
}
