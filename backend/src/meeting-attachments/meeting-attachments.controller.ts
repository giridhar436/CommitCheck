import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MeetingAttachmentsService } from './meeting-attachments.service';
import { CreateMeetingAttachmentDto } from './dto/create-meeting-attachment.dto';
import { GetMeetingAttachmentsQueryDto } from './dto/get-meeting-attachments-query.dto';
import { UpdateMeetingAttachmentDto } from './dto/update-meeting-attachment.dto';
import { MeetingAttachmentResponseDto } from './dto/meeting-attachment-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';

/** Attachments are always nested under their project and meeting. */
@Controller('projects/:projectId/meetings/:meetingId/attachments')
export class MeetingAttachmentsController {
  constructor(
    private readonly meetingAttachmentsService: MeetingAttachmentsService,
  ) {}

  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Query() query: GetMeetingAttachmentsQueryDto,
  ): Promise<ApiResponse<Paginated<MeetingAttachmentResponseDto>>> {
    return {
      success: true,
      message: 'Attachments fetched successfully',
      data: await this.meetingAttachmentsService.findAll(projectId, meetingId, query),
    };
  }

  @Get(':id')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<MeetingAttachmentResponseDto>> {
    return {
      success: true,
      message: 'Attachment fetched successfully',
      data: await this.meetingAttachmentsService.findOne(projectId, meetingId, id),
    };
  }

  @Post()
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: CreateMeetingAttachmentDto,
  ): Promise<ApiResponse<MeetingAttachmentResponseDto>> {
    return {
      success: true,
      message: 'Attachment created successfully',
      data: await this.meetingAttachmentsService.create(projectId, meetingId, dto),
    };
  }

  @Patch(':id')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeetingAttachmentDto,
  ): Promise<ApiResponse<MeetingAttachmentResponseDto>> {
    return {
      success: true,
      message: 'Attachment updated successfully',
      data: await this.meetingAttachmentsService.update(projectId, meetingId, id, dto),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const deleted = await this.meetingAttachmentsService.remove(projectId, meetingId, id);
    return {
      success: true,
      message: 'Attachment deleted successfully',
      data: { id: deleted.id },
    };
  }
}
