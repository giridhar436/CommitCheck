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
import { CommitmentsService } from './commitments.service';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { GetCommitmentsQueryDto } from './dto/get-commitments-query.dto';
import { UpdateCommitmentDto } from './dto/update-commitment.dto';
import {
  CommitmentDetailResponseDto,
  CommitmentResponseDto,
} from './dto/commitment-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';

/** Commitments are always nested under their project. */
@Controller('projects/:projectId/commitments')
export class CommitmentsController {
  constructor(private readonly commitmentsService: CommitmentsService) {}

  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: GetCommitmentsQueryDto,
  ): Promise<ApiResponse<Paginated<CommitmentResponseDto>>> {
    return {
      success: true,
      message: 'Commitments fetched successfully',
      data: await this.commitmentsService.findAllByProject(projectId, query),
    };
  }

  @Get(':id')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<CommitmentDetailResponseDto>> {
    return {
      success: true,
      message: 'Commitment fetched successfully',
      data: await this.commitmentsService.findOne(projectId, id),
    };
  }

  @Post()
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateCommitmentDto,
  ): Promise<ApiResponse<CommitmentResponseDto>> {
    return {
      success: true,
      message: 'Commitment created successfully',
      data: await this.commitmentsService.create(projectId, dto),
    };
  }

  @Patch(':id')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommitmentDto,
  ): Promise<ApiResponse<CommitmentResponseDto>> {
    return {
      success: true,
      message: 'Commitment updated successfully',
      data: await this.commitmentsService.update(projectId, id, dto),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const deleted = await this.commitmentsService.remove(projectId, id);
    return {
      success: true,
      message: 'Commitment deleted successfully',
      data: { id: deleted.id },
    };
  }
}
