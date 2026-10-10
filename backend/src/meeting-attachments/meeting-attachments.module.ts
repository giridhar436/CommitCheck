import { Module } from '@nestjs/common';
import { MeetingAttachmentsController } from './meeting-attachments.controller';
import { MeetingAttachmentsService } from './meeting-attachments.service';

@Module({
  controllers: [MeetingAttachmentsController],
  providers: [MeetingAttachmentsService],
})
export class MeetingAttachmentsModule {}
