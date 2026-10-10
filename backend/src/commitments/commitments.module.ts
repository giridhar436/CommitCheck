import { Module } from '@nestjs/common';
import { CommitmentsController } from './commitments.controller';
import { MeetingCommitmentsController } from './meeting-commitments.controller';
import { CommitmentsService } from './commitments.service';

@Module({
  controllers: [CommitmentsController, MeetingCommitmentsController],
  providers: [CommitmentsService],
})
export class CommitmentsModule {}
