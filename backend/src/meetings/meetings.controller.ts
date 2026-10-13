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
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { GetMeetingsQueryDto } from './dto/get-meetings-query.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingDetailResponseDto, MeetingResponseDto } from './dto/meeting-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';
import { ProjectAccess } from '../access/project-access.decorator';

/** Meetings are always nested under their project. */
@Controller('projects/:projectId/meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @ProjectAccess('read')
  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: GetMeetingsQueryDto,
  ): Promise<ApiResponse<Paginated<MeetingResponseDto>>> {
    return {
      success: true,
      message: 'Meetings fetched successfully',
      data: await this.meetingsService.findAll(projectId, query),
    };
  }

  @ProjectAccess('read')
  @Get(':id')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<MeetingDetailResponseDto>> {
    return {
      success: true,
      message: 'Meeting fetched successfully',
      data: await this.meetingsService.findOne(projectId, id),
    };
  }

  @ProjectAccess('write')
  @Post()
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMeetingDto,
  ): Promise<ApiResponse<MeetingResponseDto>> {
    return {
      success: true,
      message: 'Meeting created successfully',
      data: await this.meetingsService.create(projectId, dto),
    };
  }

  @ProjectAccess('write')
  @Patch(':id')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeetingDto,
  ): Promise<ApiResponse<MeetingResponseDto>> {
    return {
      success: true,
      message: 'Meeting updated successfully',
      data: await this.meetingsService.update(projectId, id, dto),
    };
  }

  @ProjectAccess('write')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const deleted = await this.meetingsService.remove(projectId, id);
    return {
      success: true,
      message: 'Meeting deleted successfully',
      data: { id: deleted.id },
    };
  }
}
