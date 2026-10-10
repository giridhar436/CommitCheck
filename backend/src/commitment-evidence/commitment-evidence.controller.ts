import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommitmentEvidenceService } from './commitment-evidence.service';
import { CreateCommitmentEvidenceDto } from './dto/create-commitment-evidence.dto';
import { GetCommitmentEvidenceQueryDto } from './dto/get-commitment-evidence-query.dto';
import { CommitmentEvidenceResponseDto } from './dto/commitment-evidence-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';

/** Evidence is always nested under its commitment, itself nested under its project. */
@Controller('projects/:projectId/commitments/:commitmentId/evidence')
export class CommitmentEvidenceController {
  constructor(private readonly evidenceService: CommitmentEvidenceService) {}

  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
    @Query() query: GetCommitmentEvidenceQueryDto,
  ): Promise<ApiResponse<Paginated<CommitmentEvidenceResponseDto>>> {
    return {
      success: true,
      message: 'Evidence fetched successfully',
      data: await this.evidenceService.findAll(projectId, commitmentId, query),
    };
  }

  @Get(':id')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<CommitmentEvidenceResponseDto>> {
    return {
      success: true,
      message: 'Evidence fetched successfully',
      data: await this.evidenceService.findOne(projectId, commitmentId, id),
    };
  }

  @Post()
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
    @Body() dto: CreateCommitmentEvidenceDto,
  ): Promise<ApiResponse<CommitmentEvidenceResponseDto>> {
    return {
      success: true,
      message: 'Evidence created successfully',
      data: await this.evidenceService.create(projectId, commitmentId, dto),
    };
  }

  /** Deliberately no PATCH — evidence is immutable; delete and recreate. */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const deleted = await this.evidenceService.remove(projectId, commitmentId, id);
    return {
      success: true,
      message: 'Evidence deleted successfully',
      data: { id: deleted.id },
    };
  }
}
