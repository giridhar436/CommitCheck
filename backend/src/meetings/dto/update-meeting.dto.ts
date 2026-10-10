import { PartialType } from '@nestjs/mapped-types';
import { CreateMeetingDto } from './create-meeting.dto';

/** All fields optional; see Phase 4 notes before letting clients set analysisStatus. */
export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}
