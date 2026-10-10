import { CommitmentEvidence } from '@prisma/client';
import { CommitmentEvidenceResponseDto } from './dto/commitment-evidence-response.dto';

/** Maps Prisma rows to the API's JSON contract: dates → ISO strings. */
export class CommitmentEvidenceMapper {
  static toResponseDto(evidence: CommitmentEvidence): CommitmentEvidenceResponseDto {
    return {
      id: evidence.id,
      commitmentId: evidence.commitmentId,
      quote: evidence.quote,
      timestamp: evidence.timestamp ? evidence.timestamp.toISOString() : null,
      source: evidence.source,
      createdAt: evidence.createdAt.toISOString(),
    };
  }
}
