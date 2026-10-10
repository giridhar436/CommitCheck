import { Module } from '@nestjs/common';
import { CommitmentEvidenceController } from './commitment-evidence.controller';
import { CommitmentEvidenceService } from './commitment-evidence.service';

@Module({
  controllers: [CommitmentEvidenceController],
  providers: [CommitmentEvidenceService],
})
export class CommitmentEvidenceModule {}
