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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { GetDocumentsQueryDto } from './dto/get-documents-query.dto';
import { ProcessDocumentDto } from './dto/process-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentDetailDto, DocumentResponseDto } from './dto/document-response.dto';
import { ApiResponse, Paginated } from '../common/api-response';
import { ProjectAccess } from '../access/project-access.decorator';

/**
 * Phase 13 — project documents. Metadata CRUD over the existing Document
 * model (the binary lives in Supabase Storage, out of band) plus the
 * deterministic text-extraction lifecycle. Processing never touches
 * authorization or risk decisions — Phase 10/11 semantics are unchanged.
 */
@Controller('projects/:projectId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ProjectAccess('read')
  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: GetDocumentsQueryDto,
  ): Promise<ApiResponse<Paginated<DocumentResponseDto>>> {
    return {
      success: true,
      message: 'Documents fetched successfully',
      data: await this.documentsService.findAllByProject(projectId, query),
    };
  }

  @ProjectAccess('read')
  @Get(':id')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<DocumentDetailDto>> {
    return {
      success: true,
      message: 'Document fetched successfully',
      data: await this.documentsService.findOne(projectId, id),
    };
  }

  @ProjectAccess('write')
  @Post()
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDocumentDto,
  ): Promise<ApiResponse<DocumentResponseDto>> {
    return {
      success: true,
      message: 'Document created successfully',
      data: await this.documentsService.create(projectId, dto),
    };
  }

  @ProjectAccess('write')
  @Patch(':id')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<ApiResponse<DocumentResponseDto>> {
    return {
      success: true,
      message: 'Document updated successfully',
      data: await this.documentsService.update(projectId, id, dto),
    };
  }

  /** Deterministic text extraction — synchronous, idempotent. */
  @ProjectAccess('write')
  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  async process(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessDocumentDto,
  ): Promise<ApiResponse<DocumentDetailDto>> {
    return {
      success: true,
      message: 'Document processed successfully',
      data: await this.documentsService.process(projectId, id, dto),
    };
  }

  @ProjectAccess('write')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const deleted = await this.documentsService.remove(projectId, id);
    return {
      success: true,
      message: 'Document deleted successfully',
      data: { id: deleted.id },
    };
  }
}
