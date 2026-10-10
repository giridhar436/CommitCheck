import { EvidenceSource } from '@prisma/client';

/** JSON contract for one evidence row (immutable — no update endpoint). */
export class CommitmentEvidenceResponseDto {
  id!: string;
  commitmentId!: string;
  quote!: string;
  timestamp!: string | null;
  source!: EvidenceSource;
  createdAt!: string;
}
