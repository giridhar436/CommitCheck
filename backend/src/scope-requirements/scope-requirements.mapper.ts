import { Document, ScopeRequirement } from '@prisma/client';
import { ScopeRequirementResponseDto } from './dto/scope-requirement-response.dto';

/** Shape of a requirement row loaded with the `sourceDocument` include. */
export type RequirementWithSource = ScopeRequirement & {
  sourceDocument: Pick<Document, 'id' | 'title' | 'type'> | null;
};

/** Maps a Prisma row to the API's JSON contract (dates → ISO strings). */
export class ScopeRequirementsMapper {
  static toResponseDto(requirement: RequirementWithSource): ScopeRequirementResponseDto {
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
      sourceDocument: requirement.sourceDocument
        ? {
            id: requirement.sourceDocument.id,
            title: requirement.sourceDocument.title,
            type: requirement.sourceDocument.type,
          }
        : null,
      createdAt: requirement.createdAt.toISOString(),
      updatedAt: requirement.updatedAt.toISOString(),
    };
  }
}
