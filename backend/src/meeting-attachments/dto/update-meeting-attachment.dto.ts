import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMeetingAttachmentDto } from './create-meeting-attachment.dto';

/** uploadedAt is fixed at creation time — only the four metadata fields are editable. */
export class UpdateMeetingAttachmentDto extends PartialType(
  OmitType(CreateMeetingAttachmentDto, ['uploadedAt'] as const),
) {}
